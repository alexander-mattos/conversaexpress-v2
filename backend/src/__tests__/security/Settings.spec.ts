// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh";

const listSettings = jest.fn();
const updateSetting = jest.fn();
const settingFindOne = jest.fn();
const userFindByPk = jest.fn();
const companyFindByPk = jest.fn();
const planFindByPk = jest.fn();
const updateSchedules = jest.fn();
const updateInvoice = jest.fn();

jest.mock("../../libs/socket", () => ({ getIO: () => ({ to: () => ({ emit: jest.fn() }) }) }));
jest.mock("../../services/SettingServices/ListSettingsService", () => ({ __esModule: true, default: listSettings }));
jest.mock("../../services/SettingServices/UpdateSettingService", () => ({ __esModule: true, default: updateSetting }));
jest.mock("../../models/Setting", () => ({ __esModule: true, default: { findOne: settingFindOne, findOrCreate: jest.fn() } }));
jest.mock("../../models/User", () => ({ __esModule: true, default: { findByPk: userFindByPk } }));
jest.mock("../../models/Company", () => ({ __esModule: true, default: { findByPk: companyFindByPk } }));
jest.mock("../../models/Plan", () => ({ __esModule: true, default: { findByPk: planFindByPk } }));
jest.mock("../../services/CompanyService/UpdateSchedulesService", () => ({ __esModule: true, default: updateSchedules }));
jest.mock("../../services/InvoicesService/UpdateInvoiceService", () => ({ __esModule: true, default: updateInvoice }));

/* eslint-disable @typescript-eslint/no-var-requires */
const SettingController = require("../../controllers/SettingController");
const { presentSettings, parseSettingChange } = require("../../helpers/SettingsAccess");
const UpdateCompanyService = require("../../services/CompanyService/UpdateCompanyService").default;

const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const row = (key: string, value: string) => ({ key, value, toJSON: () => ({ key, value }) });
const rows = [row("userRating", "enabled"), row("asaas", "segredo-asaas"), row("tokenixc", ""), row("ipmkauth", "https://mk.exemplo.com")];

beforeEach(() => {
  jest.clearAllMocks();
  userFindByPk.mockResolvedValue({ id: 1, super: false });
});

describe("configurações: leitura", () => {
  it("atendente só recebe as opções públicas", async () => {
    listSettings.mockResolvedValue(rows);
    const res = response();
    await SettingController.index({ user: { id: 5, companyId: 7, profile: "user" } }, res);
    const data = res.json.mock.calls[0][0];
    expect(data.map((s: any) => s.key)).toEqual(["userRating"]);
    expect(JSON.stringify(data)).not.toContain("segredo-asaas");
  });

  it("admin recebe os segredos mascarados (só se estão configurados)", async () => {
    listSettings.mockResolvedValue(rows);
    const res = response();
    await SettingController.index({ user: { id: 1, companyId: 7, profile: "admin" } }, res);
    const data = res.json.mock.calls[0][0];
    expect(JSON.stringify(data)).not.toContain("segredo-asaas");
    expect(data.find((s: any) => s.key === "asaas")).toEqual({ key: "asaas", value: "", configured: true });
    expect(data.find((s: any) => s.key === "tokenixc")).toEqual({ key: "tokenixc", value: "", configured: false });
    expect(data.find((s: any) => s.key === "ipmkauth").value).toBe("https://mk.exemplo.com");
  });

  it("presentSettings não muta e esconde chaves desconhecidas de quem não é admin", () => {
    expect(presentSettings([{ key: "enabled", value: "x" }], false)).toEqual([]);
  });
});

describe("configurações: escrita", () => {
  it("só chaves conhecidas e valores dos selects (400)", () => {
    expect(() => parseSettingChange("qualquer", "x", false)).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => parseSettingChange("userRating", "talvez", false)).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(parseSettingChange("scheduleType", "company", false)).toEqual({ key: "scheduleType", value: "company" });
  });

  it("URL de integração para a rede interna é recusada", () => {
    for (const url of ["http://127.0.0.1:8080", "http://169.254.169.254/latest", "http://10.0.0.5", "http://localhost", "ftp://x.com"]) {
      expect(() => parseSettingChange("ipmkauth", url, false)).toThrow(expect.objectContaining({ statusCode: 400 }));
    }
    expect(parseSettingChange("ipixc", "https://ixc.exemplo.com", false)).toEqual({ key: "ipixc", value: "https://ixc.exemplo.com" });
  });

  it("segredo em branco mantém o atual", () => {
    expect(parseSettingChange("asaas", "", false)).toEqual({ key: "asaas", keep: true });
    expect(parseSettingChange("asaas", "novo", false)).toEqual({ key: "asaas", value: "novo" });
  });

  it("campaignsEnabled só pelo super", async () => {
    expect(() => parseSettingChange("campaignsEnabled", "true", false)).toThrow(expect.objectContaining({ statusCode: 403 }));
    await expect(
      SettingController.update({ params: { settingKey: "campaignsEnabled" }, body: { value: "true" }, user: { id: 1, companyId: 7, profile: "admin" } }, response())
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(updateSetting).not.toHaveBeenCalled();
  });

  it("atendente não altera (403) e a resposta do admin não traz o segredo", async () => {
    await expect(
      SettingController.update({ params: { settingKey: "userRating" }, body: { value: "enabled" }, user: { id: 5, companyId: 7, profile: "user" } }, response())
    ).rejects.toMatchObject({ statusCode: 403 });

    updateSetting.mockResolvedValue(row("asaas", "novo-segredo"));
    const res = response();
    await SettingController.update({ params: { settingKey: "asaas" }, body: { value: "novo-segredo" }, user: { id: 1, companyId: 7, profile: "admin" } }, res);
    expect(updateSetting).toHaveBeenCalledWith({ key: "asaas", value: "novo-segredo", companyId: 7 });
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain("novo-segredo");
  });
});

describe("empresa: horários, plano e faturas", () => {
  it("horário inválido é recusado antes de gravar", async () => {
    const CompanyController = require("../../controllers/CompanyController");
    companyFindByPk.mockResolvedValue({ id: 7 });
    await expect(
      CompanyController.updateSchedules(
        { params: { id: "7" }, body: { schedules: [{ weekdayEn: "monday", startTime: "25:00", endTime: "" }] }, user: { id: 1, companyId: 7, profile: "admin" } },
        response()
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(updateSchedules).not.toHaveBeenCalled();
  });

  it("plano inexistente (404)", async () => {
    companyFindByPk.mockResolvedValue({ id: 7, update: jest.fn() });
    planFindByPk.mockResolvedValue(null);
    await expect(UpdateCompanyService({ id: 7, name: "X", planId: 999 })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("fatura só com status conhecido", async () => {
    const InvoicesController = require("../../controllers/InvoicesController");
    await expect(InvoicesController.update({ params: { id: "1" }, body: { status: "estornada" }, user: { id: 1 } }, response())).rejects.toMatchObject({
      statusCode: 400
    });
    expect(updateInvoice).not.toHaveBeenCalled();
  });
});
