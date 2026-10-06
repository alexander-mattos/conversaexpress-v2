import fs from "fs";
import path from "path";
import { readSheet } from "read-excel-file/node";
import AppError from "../../errors/AppError";
import ContactListItem from "../../models/ContactListItem";
import CheckContactNumber from "../WbotServices/CheckNumber";
import { logger } from "../../utils/logger";

const MAX_ROWS = 10000;

type Cell = string | number | boolean | Date | null | undefined;

const normalize = (value: Cell): string =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const COLUMNS = {
  name: ["nome", "name"],
  number: ["numero", "number", "telefone", "phone", "whatsapp"],
  email: ["email", "e-mail"]
};

// CSV simples: separador "," ou ";" (o que aparecer na primeira linha) e
// campos entre aspas.
export const parseCsv = (text: string): string[][] => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

// Primeira linha = cabeçalho (nome, número, e-mail, com ou sem acento).
export const rowsToContacts = (rows: Cell[][]): { name: string; number: string; email: string }[] => {
  const [header = [], ...data] = rows;
  const titles = header.map(normalize);
  const index = (names: string[]) => titles.findIndex(title => names.includes(title));
  const nameAt = index(COLUMNS.name);
  const numberAt = index(COLUMNS.number);
  const emailAt = index(COLUMNS.email);
  if (numberAt === -1) throw new AppError("ERR_IMPORT_NO_NUMBER_COLUMN", 400);
  if (data.length > MAX_ROWS) throw new AppError("ERR_IMPORT_TOO_MANY_ROWS", 400);

  return data
    .map(row => ({
      name: nameAt === -1 ? "" : String(row[nameAt] ?? "").trim().slice(0, 200),
      number: String(row[numberAt] ?? "").replace(/\D/g, "").slice(0, 20),
      email: emailAt === -1 ? "" : String(row[emailAt] ?? "").trim().slice(0, 200)
    }))
    .filter(contact => contact.number.length >= 8);
};

const readRows = async (file: Express.Multer.File): Promise<Cell[][]> => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ext === ".csv") return parseCsv(await fs.promises.readFile(file.path, "utf8"));
  if (ext === ".xlsx") {
    try {
      return (await readSheet(file.path)) as Cell[][];
    } catch {
      throw new AppError("ERR_INVALID_FILE_TYPE", 400);
    }
  }
  throw new AppError("ERR_INVALID_FILE_TYPE", 400);
};

export async function ImportContacts(
  contactListId: number,
  companyId: number,
  file: Express.Multer.File | undefined
) {
  if (!file) throw new AppError("ERR_NO_FILE", 400);
  const contacts = rowsToContacts(await readRows(file));

  const contactList: ContactListItem[] = [];

  for (const contact of contacts) {
    const [newContact, created] = await ContactListItem.findOrCreate({
      where: {
        number: contact.number,
        contactListId,
        companyId
      },
      defaults: { ...contact, contactListId, companyId }
    });
    if (created) {
      contactList.push(newContact);
    }
  }

  for (const newContact of contactList) {
    try {
      const response = await CheckContactNumber(newContact.number, companyId);
      newContact.isWhatsappValid = response.exists;
      const number = response.jid.replace(/\D/g, "");
      newContact.number = number;
      await newContact.save();
    } catch (e) {
      logger.error(`Número de contato inválido: ${newContact.number}`);
    }
  }

  return contactList;
}
