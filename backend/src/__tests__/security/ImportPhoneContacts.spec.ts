import fs from "fs";

const showBaileys = jest.fn();
const findOne = jest.fn();
const createContact = jest.fn();

jest.mock("../../helpers/GetDefaultWhatsApp", () => ({ __esModule: true, default: jest.fn(async () => ({ id: 3 })) }));
jest.mock("../../libs/wbot", () => ({ getWbot: () => ({ id: 3 }) }));
jest.mock("../../services/BaileysServices/ShowBaileysService", () => ({ __esModule: true, default: showBaileys }));
jest.mock("../../services/ContactServices/CreateContactService", () => ({ __esModule: true, default: createContact }));
jest.mock("../../models/Contact", () => ({ __esModule: true, default: { findOne } }));

/* eslint-disable @typescript-eslint/no-var-requires */
const ImportContactsService = require("../../services/WbotServices/ImportContactsService").default;

describe("importar contatos do celular", () => {
  it("não grava a lista em arquivos públicos e importa em sequência", async () => {
    const writeFile = jest.spyOn(fs, "writeFile");
    const writeFileSync = jest.spyOn(fs, "writeFileSync");
    showBaileys.mockResolvedValue({
      contacts: [
        { id: "5511999990001@s.whatsapp.net", name: "Ana" },
        { id: "status@broadcast" },
        { id: "123@g.us", name: "Grupo" },
        { id: "5511999990002@s.whatsapp.net", notify: "Bruno" }
      ]
    });
    const existing = { name: "Antigo", save: jest.fn() };
    findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);

    await ImportContactsService(7);

    expect(writeFile).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(existing.name).toBe("Ana");
    expect(existing.save).toHaveBeenCalled();
    expect(createContact).toHaveBeenCalledWith({ number: "5511999990002", name: "Bruno", companyId: 7 });
  });
});
