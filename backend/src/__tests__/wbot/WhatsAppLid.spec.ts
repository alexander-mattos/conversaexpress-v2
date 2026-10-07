// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const contactFindOne = jest.fn();
const contactCreate = jest.fn();

jest.mock("../../libs/socket", () => ({ getIO: () => ({ to: () => ({ emit: jest.fn() }) }) }));
jest.mock("../../models/Contact", () => ({ __esModule: true, default: { findOne: contactFindOne, create: contactCreate } }));
jest.mock("../../models/ContactCustomField", () => ({ __esModule: true, default: {} }));

/* eslint-disable @typescript-eslint/no-var-requires */
const { contactJid, jidDigits, senderJids } = require("../../helpers/WhatsAppJid");
const CreateOrUpdateContactService = require("../../services/ContactServices/CreateOrUpdateContactService").default;

const LID = "123456789012345@lid";
const PN = "5511999990000@s.whatsapp.net";

describe("senderJids", () => {
  it("1:1 por LID com o telefone em senderPn", () => {
    expect(senderJids({ remoteJid: LID, senderPn: PN })).toEqual({ lidJid: LID, pnJid: PN });
  });

  it("1:1 só com LID (sem telefone)", () => {
    expect(senderJids({ remoteJid: LID })).toEqual({ lidJid: LID, pnJid: undefined });
  });

  it("1:1 pelo telefone, como antes (sufixo de dispositivo removido)", () => {
    expect(senderJids({ remoteJid: "5511999990000:12@s.whatsapp.net" })).toEqual({ pnJid: PN });
  });

  it("grupo: participante por LID com participantPn", () => {
    expect(senderJids({ remoteJid: "1203630@g.us", participant: LID, participantPn: PN })).toEqual({ lidJid: LID, pnJid: PN });
  });
});

describe("contactJid", () => {
  it("telefone conhecido: envia para o telefone, mesmo com LID gravado", () => {
    expect(contactJid({ number: "5511999990000", lid: LID })).toBe(PN);
  });

  it("só LID (número igual aos dígitos do LID): envia para o LID", () => {
    expect(contactJid({ number: jidDigits(LID), lid: LID })).toBe(LID);
  });

  it("grupo", () => {
    expect(contactJid({ number: "1203630" }, true)).toBe("1203630@g.us");
  });
});

describe("CreateOrUpdateContactService com LID", () => {
  beforeEach(() => jest.clearAllMocks());

  it("corrige o contato antigo gravado com os dígitos do LID, sem duplicar", async () => {
    const legacy = { id: 9, number: jidDigits(LID), lid: null, whatsappId: null, update: jest.fn() };
    contactFindOne
      .mockResolvedValueOnce(null) // pelo telefone
      .mockResolvedValueOnce(null) // pelo LID
      .mockResolvedValueOnce(legacy); // pelos dígitos do LID (formato antigo)
    const contact = await CreateOrUpdateContactService({ name: "Maria", number: "5511999990000", isGroup: false, companyId: 1, whatsappId: 3, lid: LID });
    expect(contact).toBe(legacy);
    expect(legacy.update).toHaveBeenCalledWith({ lid: LID, number: "5511999990000", whatsappId: 3 });
    expect(contactCreate).not.toHaveBeenCalled();
  });

  it("só com LID: acha pelo LID e não troca o número", async () => {
    const byLid = { id: 9, number: jidDigits(LID), lid: LID, whatsappId: 3, update: jest.fn() };
    contactFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(byLid);
    await CreateOrUpdateContactService({ name: "Maria", number: jidDigits(LID), isGroup: false, companyId: 1, whatsappId: 3, lid: LID });
    expect(byLid.update).not.toHaveBeenCalled();
    expect(contactCreate).not.toHaveBeenCalled();
  });

  it("contato novo guarda o telefone e o LID", async () => {
    contactFindOne.mockResolvedValue(null);
    contactCreate.mockResolvedValue({ id: 10 });
    await CreateOrUpdateContactService({ name: "Ana", number: "5511988880000", isGroup: false, companyId: 1, whatsappId: 3, lid: LID });
    expect(contactCreate).toHaveBeenCalledWith(expect.objectContaining({ number: "5511988880000", lid: LID }));
  });
});
