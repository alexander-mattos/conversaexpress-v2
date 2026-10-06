// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const findOneBy: Record<string, jest.Mock> = {};
const modelMock = (name: string, extra: Record<string, unknown> = {}) => {
  findOneBy[name] = jest.fn();
  return { __esModule: true, default: { findOne: findOneBy[name], ...extra } };
};
const companyFindByPk = jest.fn();
const userFindByPk = jest.fn();
const campaignUpdate = jest.fn();
const queueAdd = jest.fn();
const createListItem = jest.fn();
const emits: { event: string; payload: any }[] = [];

jest.mock("../../libs/socket", () => ({
  getIO: () => ({ to: () => ({ emit: (event: string, payload: any) => emits.push({ event, payload }) }) })
}));
jest.mock("../../queues", () => ({ campaignQueue: { add: queueAdd, getJob: jest.fn() } }));
jest.mock("../../models/Whatsapp", () => modelMock("Whatsapp"));
jest.mock("../../models/ContactList", () => modelMock("ContactList"));
jest.mock("../../models/Tag", () => modelMock("Tag"));
jest.mock("../../models/Files", () => modelMock("Files"));
jest.mock("../../models/Setting", () => modelMock("Setting"));
jest.mock("../../models/Campaign", () => modelMock("Campaign", { findByPk: jest.fn(), create: jest.fn() }));
jest.mock("../../models/CampaignShipping", () => ({ __esModule: true, default: { findAll: jest.fn().mockResolvedValue([]) } }));
jest.mock("../../models/Company", () => ({ __esModule: true, default: { findByPk: companyFindByPk } }));
jest.mock("../../models/Plan", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/User", () => ({ __esModule: true, default: { findByPk: userFindByPk } }));
jest.mock("../../models/ContactListItem", () => ({ __esModule: true, default: {} }));
jest.mock("../../services/WbotServices/CheckNumber", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../../services/ContactListItemService/CreateService", () => ({ __esModule: true, default: createListItem }));
for (const service of ["ListService", "ShowService", "UpdateService", "DeleteService", "FindService"]) {
  jest.doMock(`../../services/ContactListItemService/${service}`, () => ({ __esModule: true, default: jest.fn() }));
}
jest.mock("../../services/CampaignService/FindService", () => ({ __esModule: true, default: jest.fn().mockResolvedValue([]) }));

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const {
  parseCampaignInput,
  parseCampaignSettings,
  canEditCampaign,
  campaignsEnabledFor
} = require("../../helpers/CampaignAccess");
const { campaignMediaPath, isCampaignMediaFile, isSpreadsheetFile } = require("../../config/upload");
const { parseCsv, rowsToContacts } = require("../../services/ContactListService/ImportContacts");
const UpdateService = require("../../services/CampaignService/UpdateService").default;
const { CancelService } = require("../../services/CampaignService/CancelService");
const { RestartService } = require("../../services/CampaignService/RestartService");
const CampaignController = require("../../controllers/CampaignController");
const ContactListItemController = require("../../controllers/ContactListItemController");

const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const admin = { id: 1, companyId: 7, profile: "admin" };

beforeEach(() => {
  jest.clearAllMocks();
  emits.length = 0;
  Object.values(findOneBy).forEach(mock => mock.mockResolvedValue({ id: 1 }));
  userFindByPk.mockResolvedValue({ id: 1, super: false });
});

describe("campanha: campos aceitos", () => {
  it("status, mediaPath, mediaName, completedAt e companyId do corpo são ignorados", async () => {
    const input = await parseCampaignInput(
      { name: "Promo", status: "FINALIZADA", mediaPath: "../../.env", mediaName: "x", completedAt: "2020-01-01", companyId: 99 },
      7
    );
    expect(input).not.toHaveProperty("status");
    expect(input).not.toHaveProperty("mediaPath");
    expect(input).not.toHaveProperty("companyId");
    expect(input).not.toHaveProperty("completedAt");
  });

  it("conexão de outra empresa (403)", async () => {
    findOneBy.Whatsapp.mockResolvedValue(null);
    await expect(parseCampaignInput({ name: "Promo", whatsappId: 5 }, 7)).rejects.toMatchObject({ statusCode: 403 });
    expect(findOneBy.Whatsapp.mock.calls[0][0].where).toEqual({ id: 5, companyId: 7 });
  });

  it("lista, tag e lista de arquivos de outra empresa (403)", async () => {
    for (const [model, field] of [["ContactList", "contactListId"], ["Tag", "tagListId"], ["Files", "fileListId"]]) {
      Object.values(findOneBy).forEach(mock => mock.mockResolvedValue({ id: 1 }));
      findOneBy[model].mockResolvedValue(null);
      await expect(parseCampaignInput({ name: "Promo", [field]: 3 }, 7)).rejects.toMatchObject({ statusCode: 403 });
    }
  });

  it("nome curto, id inválido e data inválida (400)", async () => {
    await expect(parseCampaignInput({ name: "ab" }, 7)).rejects.toMatchObject({ statusCode: 400 });
    await expect(parseCampaignInput({ name: "Promo", whatsappId: "x" }, 7)).rejects.toMatchObject({ statusCode: 400 });
    await expect(parseCampaignInput({ name: "Promo", scheduledAt: "ontem" }, 7)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("'Nenhuma' na tag vale como sem tag", async () => {
    const input = await parseCampaignInput({ name: "Promo", tagListId: "Nenhuma" }, 7);
    expect(input.tagId).toBeNull();
  });
});

describe("campanha: status vem do registro", () => {
  const input = { name: "Promo", message1: "", message2: "", message3: "", message4: "", message5: "", scheduledAt: null, whatsappId: null, contactListId: null, tagId: null, fileListId: null };

  it("campanha em andamento não é editada (400), mesmo com status forjado no corpo", async () => {
    findOneBy.Campaign.mockResolvedValue({ id: 1, status: "EM_ANDAMENTO", update: campaignUpdate });
    await expect(UpdateService(1, { ...input, status: "INATIVA" }, 7)).rejects.toMatchObject({ statusCode: 400 });
    expect(campaignUpdate).not.toHaveBeenCalled();
  });

  it("programada a menos de 1h não é editada", () => {
    const now = Date.now();
    expect(canEditCampaign({ status: "PROGRAMADA", scheduledAt: new Date(now + 30 * 60000) }, now)).toBe(false);
    expect(canEditCampaign({ status: "PROGRAMADA", scheduledAt: new Date(now + 2 * 3600000) }, now)).toBe(true);
    expect(canEditCampaign({ status: "INATIVA" }, now)).toBe(true);
    expect(canEditCampaign({ status: "FINALIZADA" }, now)).toBe(false);
  });

  it("campanha de outra empresa não é encontrada (404)", async () => {
    findOneBy.Campaign.mockResolvedValue(null);
    await expect(UpdateService(1, input, 7)).rejects.toMatchObject({ statusCode: 404 });
    expect(findOneBy.Campaign.mock.calls[0][0].where).toEqual({ id: 1, companyId: 7 });
  });

  it("cancelar só programada/em andamento; reiniciar só cancelada", async () => {
    findOneBy.Campaign.mockResolvedValue({ id: 1, status: "FINALIZADA", update: campaignUpdate });
    await expect(CancelService(1, 7)).rejects.toMatchObject({ statusCode: 400 });
    await expect(RestartService(1, 7)).rejects.toMatchObject({ statusCode: 400 });
    expect(queueAdd).not.toHaveBeenCalled();

    findOneBy.Campaign.mockResolvedValue({ id: 1, status: "CANCELADA", update: campaignUpdate });
    await RestartService(1, 7);
    expect(queueAdd).toHaveBeenCalled();
  });
});

describe("campanha: mídia e planilhas", () => {
  it("mediaPath forjado nunca sai das pastas públicas", () => {
    const resolved = campaignMediaPath(3, "../../.env");
    expect(path.basename(resolved)).toBe(".env");
    expect(resolved).toMatch(/[\\/]public[\\/]/);
    expect(resolved).not.toMatch(/backend[\\/]\.env$/);
  });

  it("mídia aceita só imagem, vídeo, áudio e PDF", () => {
    expect(isCampaignMediaFile({ originalname: "a.pdf", mimetype: "application/pdf" })).toBe(true);
    expect(isCampaignMediaFile({ originalname: "a.jpg", mimetype: "image/jpeg" })).toBe(true);
    expect(isCampaignMediaFile({ originalname: "a.html", mimetype: "text/html" })).toBe(false);
    expect(isCampaignMediaFile({ originalname: "a.zip", mimetype: "application/zip" })).toBe(false);
  });

  it("planilha só .xlsx ou .csv", () => {
    expect(isSpreadsheetFile({ originalname: "lista.xlsx" })).toBe(true);
    expect(isSpreadsheetFile({ originalname: "lista.csv" })).toBe(true);
    expect(isSpreadsheetFile({ originalname: "lista.xls" })).toBe(false);
  });

  it("CSV com ; e aspas, cabeçalho com acento, linhas sem número descartadas", () => {
    const rows = parseCsv('Nome;Número;E-mail\n"Silva; Ana";(11) 98888-7777;ana@x.com\nSem número;;\n');
    expect(rowsToContacts(rows)).toEqual([{ name: "Silva; Ana", number: "11988887777", email: "ana@x.com" }]);
  });

  it("planilha sem coluna de número (400)", () => {
    expect(() => rowsToContacts([["nome"], ["Ana"]])).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe("campanha: configurações e plano", () => {
  it("só chaves conhecidas, valores como JSON válido", () => {
    expect(parseCampaignSettings({ messageInterval: "20", variables: [{ key: "loja", value: "Centro" }] })).toEqual({
      messageInterval: "20",
      variables: JSON.stringify([{ key: "loja", value: "Centro" }])
    });
    expect(() => parseCampaignSettings({ outra: 1 })).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => parseCampaignSettings({ messageInterval: -1 })).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => parseCampaignSettings({ variables: [{ key: "a b(", value: "" }] })).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it("liberado pelo plano ou por campaignsEnabled", async () => {
    companyFindByPk.mockResolvedValue({ plan: { useCampaigns: false } });
    findOneBy.Setting.mockResolvedValue({ value: "true" });
    expect(await campaignsEnabledFor(7)).toBe(true);
    findOneBy.Setting.mockResolvedValue(null);
    expect(await campaignsEnabledFor(7)).toBe(false);
    companyFindByPk.mockResolvedValue({ plan: { useCampaigns: true } });
    expect(await campaignsEnabledFor(7)).toBe(true);
  });

  it("o super passa pelo plano; os demais recebem 403 sem campanhas", async () => {
    const { campaignsPlan } = require("../../helpers/CampaignAccess");
    companyFindByPk.mockResolvedValue({ plan: { useCampaigns: false } });
    findOneBy.Setting.mockResolvedValue(null);
    const next = jest.fn();
    await expect(campaignsPlan({ user: admin }, response(), next)).rejects.toMatchObject({ statusCode: 403 });
    userFindByPk.mockResolvedValue({ id: 1, super: true });
    await campaignsPlan({ user: admin }, response(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("listas: outra empresa", () => {
  it("/campaigns/list com companyId de outra empresa (403)", async () => {
    await expect(CampaignController.findList({ query: { companyId: "99" }, user: admin }, response())).rejects.toMatchObject({
      statusCode: 403
    });
  });

  it("contato em lista de outra empresa (403) e isWhatsappValid do corpo ignorado", async () => {
    findOneBy.ContactList.mockResolvedValue(null);
    await expect(
      ContactListItemController.store({ body: { name: "Ana", number: "11999", contactListId: 3 }, user: admin }, response())
    ).rejects.toMatchObject({ statusCode: 403 });

    findOneBy.ContactList.mockResolvedValue({ id: 3 });
    createListItem.mockResolvedValue({ id: 1 });
    await ContactListItemController.store(
      { body: { name: "Ana", number: "(11) 999", contactListId: 3, isWhatsappValid: true, companyId: 99 }, user: admin },
      response()
    );
    expect(createListItem).toHaveBeenCalledWith({ name: "Ana", number: "11999", email: "", contactListId: 3, companyId: 7 });
  });
});
