type Cell = string | number | boolean | Date | null | undefined;

// Primeira linha = cabeçalhos; linhas vazias são ignoradas (como o
// sheet_to_json do xlsx usado no frontend atual).
export const rowsToObjects = (rows: Cell[][]): Record<string, Cell>[] => {
  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map(cell => (cell === null || cell === undefined ? "" : String(cell).trim()));
  return body
    .filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""))
    .map(row => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? undefined]).filter(([key]) => key !== "")));
};

// Formato aceito por POST /contacts/upload: { Nome, Telefone } em texto
// (telefones digitados como número quebravam a importação).
export const toUploadRows = (objects: Record<string, Cell>[]): { Nome: string; Telefone: string }[] =>
  objects.map(o => ({
    Nome: o.Nome === null || o.Nome === undefined ? "" : String(o.Nome),
    Telefone: o.Telefone === null || o.Telefone === undefined ? "" : String(o.Telefone)
  }));

const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// CSV com ";" (como o react-csv configurado hoje) e BOM para o Excel abrir
// os acentos corretamente.
export const contactsCsv = (contacts: { name?: string; number?: string; email?: string }[]): string =>
  "﻿" +
  ["name;number;email", ...contacts.map(c => [c.name, c.number, c.email].map(csvCell).join(";"))].join("\r\n");
