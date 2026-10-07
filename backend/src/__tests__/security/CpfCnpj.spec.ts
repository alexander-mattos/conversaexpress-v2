export {};

/* eslint-disable @typescript-eslint/no-var-requires */
const { isValidCpfCnpj, parseDocument } = require("../../helpers/CpfCnpj");

describe("CPF/CNPJ", () => {
  it("valida CPF e CNPJ com ou sem máscara", () => {
    expect(isValidCpfCnpj("529.982.247-25")).toBe(true);
    expect(isValidCpfCnpj("52998224725")).toBe(true);
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCpfCnpj("529.982.247-24")).toBe(false);
    expect(isValidCpfCnpj("111.111.111-11")).toBe(false);
    expect(isValidCpfCnpj("11.222.333/0001-80")).toBe(false);
    expect(isValidCpfCnpj("123")).toBe(false);
    expect(isValidCpfCnpj("")).toBe(false);
  });

  it("parseDocument: vazio, obrigatório e inválido", () => {
    expect(parseDocument(undefined)).toBeUndefined();
    expect(parseDocument("")).toBeNull();
    expect(parseDocument("529.982.247-25")).toBe("52998224725");
    expect(() => parseDocument("", true)).toThrow("ERR_INVALID_DOCUMENT");
    expect(() => parseDocument("123")).toThrow("ERR_INVALID_DOCUMENT");
  });
});

describe("cadastro público exige CPF/CNPJ", () => {
  const createCompany = jest.fn();
  beforeAll(() => {
    jest.doMock("../../config/auth", () => ({ __esModule: true, default: { secret: "s", refreshSecret: "r" } }));
    jest.doMock("../../services/CompanyService/CreateCompanyService", () => ({ __esModule: true, default: createCompany }));
    jest.doMock("../../models/Plan", () => ({ __esModule: true, default: { findByPk: jest.fn().mockResolvedValue({ id: 1 }) } }));
    jest.doMock("../../models/User", () => ({ __esModule: true, default: { findOne: jest.fn().mockResolvedValue(null) } }));
  });

  it("sem documento ou inválido é 400; válido segue só com dígitos", async () => {
    const { signup } = require("../../controllers/CompanyController");
    const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
    const body = { name: "Empresa", email: "a@b.com", password: "12345678", planId: 1 };
    await expect(signup({ body }, res)).rejects.toMatchObject({ statusCode: 400, message: "ERR_INVALID_DOCUMENT" });
    await expect(signup({ body: { ...body, document: "123" } }, res)).rejects.toMatchObject({ statusCode: 400 });
    expect(createCompany).not.toHaveBeenCalled();

    createCompany.mockResolvedValue({ company: { id: 3, name: "Empresa" } });
    await signup({ body: { ...body, document: "529.982.247-25" } }, res);
    expect(createCompany.mock.calls[0][0].document).toBe("52998224725");
  });
});
