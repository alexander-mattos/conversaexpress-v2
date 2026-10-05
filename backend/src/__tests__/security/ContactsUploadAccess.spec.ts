const createContactService = jest.fn();
const emit = jest.fn();

jest.mock("../../libs/socket", () => ({ getIO: () => ({ to: () => ({ emit }) }) }));
jest.mock("../../services/ContactServices/CreateContactService", () => ({ __esModule: true, default: createContactService }));
// Serviços que importam o Baileys (ESM) ficam isolados.
for (const mod of [
  "ContactServices/ListContactsService",
  "ContactServices/ShowContactService",
  "ContactServices/UpdateContactService",
  "ContactServices/DeleteContactService",
  "ContactServices/GetContactService",
  "ContactServices/SimpleListService",
  "WbotServices/CheckNumber",
  "WbotServices/CheckIsValidContact",
  "WbotServices/GetProfilePicUrl"
]) {
  jest.doMock(`../../services/${mod}`, () => ({ __esModule: true, default: jest.fn() }));
}
jest.mock("../../models/ContactCustomField", () => ({ __esModule: true, default: {} }));

/* eslint-disable @typescript-eslint/no-var-requires */
const { storeUpload } = require("../../controllers/ContactController");
const isAdmin = require("../../middleware/isAdmin").default;

const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("isAdmin", () => {
  it("recusa quem não é admin com 403", () => {
    const next = jest.fn();
    expect(() => isAdmin({ user: { profile: "user" } } as any, {} as any, next)).toThrow(
      expect.objectContaining({ message: "ERR_NO_PERMISSION", statusCode: 403 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("deixa o admin passar", () => {
    const next = jest.fn();
    isAdmin({ user: { profile: "admin" } } as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("importar planilha de contatos", () => {
  const req = (body: unknown): any => ({ body, user: { id: 1, companyId: 7, profile: "admin" } });

  it("recusa corpo que não é lista", async () => {
    await expect(storeUpload(req({ Nome: "x" }), response())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("aceita telefone numérico e separa linhas com erro sem derrubar as outras", async () => {
    createContactService.mockImplementation(async ({ name, number }) => ({ id: Number(number.slice(-2)), name }));
    const res = response();

    await storeUpload(
      req([
        { Nome: "Ana", Telefone: 5511999990001 },
        { Nome: "Sem telefone" },
        { Nome: "Bruno", Telefone: "+55 (11) 99999-0002" }
      ]),
      res
    );

    const { newContacts, errorBag } = res.json.mock.calls[0][0];
    expect(newContacts).toEqual([
      { contactName: "Ana", contactId: 1 },
      { contactName: "Bruno", contactId: 2 }
    ]);
    expect(errorBag).toHaveLength(1);
    expect(errorBag[0].contactName).toBe("Sem telefone");
    expect(createContactService).toHaveBeenCalledWith(expect.objectContaining({ number: "5511999990001", companyId: 7 }));
  });
});
