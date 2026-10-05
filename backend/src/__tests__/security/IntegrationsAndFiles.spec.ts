// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const filesFindAll = jest.fn();
const filesDestroy = jest.fn();
const optionFindOne = jest.fn();
const integrationFindOne = jest.fn();
const whatsappCount = jest.fn();
const showFile = jest.fn();
const rmSync = jest.fn();

jest.mock("../../middleware/isAuth", () => ({ __esModule: true, default: function isAuth() {} }));
jest.mock("../../libs/socket", () => ({ getIO: () => ({ to: () => ({ emit: jest.fn() }) }) }));
jest.mock("../../models/Files", () => ({ __esModule: true, default: { findAll: filesFindAll, destroy: filesDestroy, findByPk: jest.fn() } }));
jest.mock("../../models/FilesOptions", () => ({ __esModule: true, default: { findOne: optionFindOne, create: jest.fn() } }));
jest.mock("../../models/QueueIntegrations", () => ({ __esModule: true, default: { unscoped: () => ({ findOne: integrationFindOne }) } }));
jest.mock("../../models/Whatsapp", () => ({ __esModule: true, default: { count: whatsappCount } }));
jest.mock("../../services/FileServices/ShowService", () => ({ __esModule: true, default: showFile }));
jest.mock("fs", () => ({ ...jest.requireActual("fs"), rmSync: (...args: unknown[]) => rmSync(...args) }));
jest.mock("../../controllers/WhatsAppSessionController", () => ({ __esModule: true, default: { store: jest.fn(), update: jest.fn(), remove: jest.fn() } }));
for (const service of [
  "PromptServices/CreatePromptService",
  "PromptServices/DeletePromptService",
  "PromptServices/ListPromptsService",
  "PromptServices/ShowPromptService",
  "PromptServices/UpdatePromptService"
]) {
  jest.doMock(`../../services/${service}`, () => ({ __esModule: true, default: jest.fn() }));
}

/* eslint-disable @typescript-eslint/no-var-requires */
const { isPrivateAddress, parseExternalUrl, assertSafeExternalUrl } = require("../../helpers/SafeExternalUrl");
const { parseFileOptions } = require("../../services/FileServices/FileOptionsInput");
const DeleteAllService = require("../../services/FileServices/DeleteAllService").default;
const ShowQueueIntegrationService = require("../../services/QueueIntegrationServices/ShowQueueIntegrationService").default;
const FilesController = require("../../controllers/FilesController");
const PromptController = require("../../controllers/PromptController");
const withoutSession = require("../../helpers/WhatsappWithoutSession").default;

const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};
const admin = { id: 1, companyId: 7, profile: "admin" };

beforeEach(() => jest.clearAllMocks());

describe("URL de integração (chamada pelo servidor)", () => {
  it("reconhece endereços internos", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.0.10", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    for (const ip of ["8.8.8.8", "172.32.0.1", "2001:4860:4860::8888"]) {
      expect(isPrivateAddress(ip)).toBe(false);
    }
  });

  it("recusa protocolo, credenciais e hosts internos ao salvar", () => {
    expect(() => parseExternalUrl("file:///etc/passwd")).toThrow("ERR_INTEGRATION_INVALID_URL");
    expect(() => parseExternalUrl("https://user:pass@example.com")).toThrow("ERR_INTEGRATION_INVALID_URL");
    expect(() => parseExternalUrl("http://localhost:8080/x")).toThrow("ERR_INTEGRATION_URL_NOT_ALLOWED");
    expect(() => parseExternalUrl("http://169.254.169.254/latest/meta-data")).toThrow("ERR_INTEGRATION_URL_NOT_ALLOWED");
    expect(() => parseExternalUrl("http://[::1]/")).toThrow("ERR_INTEGRATION_URL_NOT_ALLOWED");
    expect(parseExternalUrl("https://n8n.example.com/webhook").hostname).toBe("n8n.example.com");
  });

  it("libera hosts de INTEGRATION_ALLOWED_HOSTS", async () => {
    process.env.INTEGRATION_ALLOWED_HOSTS = "n8n.local, 10.0.0.5";
    expect(parseExternalUrl("http://10.0.0.5:5678/hook").hostname).toBe("10.0.0.5");
    await expect(assertSafeExternalUrl("http://n8n.local/hook")).resolves.toBeTruthy();
    delete process.env.INTEGRATION_ALLOWED_HOSTS;
  });
});

describe("lista de arquivos", () => {
  it("opções do cliente perdem caminho e tipo", () => {
    expect(parseFileOptions([{ id: 3, name: "Catálogo", path: "../../.env", mediaType: "x", fileId: 99 }, { name: "Novo" }])).toEqual([
      { id: 3, name: "Catálogo" },
      { id: undefined, name: "Novo" }
    ]);
    expect(() => parseFileOptions("x")).toThrow("ERR_INVALID_FILE_OPTIONS");
  });

  it("apagar tudo apaga só as listas da empresa", async () => {
    filesFindAll.mockResolvedValue([{ id: 4 }]);
    await DeleteAllService(7);
    expect(filesDestroy).toHaveBeenCalledWith({ where: { companyId: 7 } });
    expect(rmSync).toHaveBeenCalledWith(expect.stringMatching(/fileList[\\/]4$/), expect.objectContaining({ recursive: true }));
  });

  it("upload para opção de outra lista é recusado e o arquivo apagado", async () => {
    optionFindOne.mockResolvedValue(null);
    const req: any = {
      params: { fileListId: "5" },
      body: { id: "9", mediaType: "image/png" },
      files: [{ path: "/tmp/public/fileList/5/1_a.png", filename: "1_a.png" }],
      user: admin
    };
    await expect(FilesController.uploadMedias(req, response())).rejects.toMatchObject({ message: "ERR_INVALID_FILE_OPTIONS" });
    expect(optionFindOne).toHaveBeenCalledWith({ where: { id: 9, fileId: 5 } });
    expect(rmSync).toHaveBeenCalledWith("/tmp/public/fileList/5/1_a.png", { force: true });
  });

  it("upload grava só o nome gerado e apaga o arquivo anterior", async () => {
    const option = { path: "antigo.png", update: jest.fn() };
    optionFindOne.mockResolvedValue(option);
    showFile.mockResolvedValue({ id: 5 });
    const req: any = {
      params: { fileListId: "5" },
      body: { id: "9", mediaType: "image/png" },
      files: [{ path: "/x/1_a.png", filename: "1_a.png" }],
      user: admin
    };
    await FilesController.uploadMedias(req, response());
    expect(option.update).toHaveBeenCalledWith({ path: "1_a.png", mediaType: "image/png" });
    expect(rmSync).toHaveBeenCalledWith(expect.stringMatching(/fileList[\\/]5[\\/]antigo\.png$/), { force: true });
  });
});

describe("integrações, prompts e conexões", () => {
  it("integração é buscada dentro da empresa", async () => {
    integrationFindOne.mockResolvedValue(null);
    await expect(ShowQueueIntegrationService(3, 7)).rejects.toMatchObject({ statusCode: 404 });
    expect(integrationFindOne).toHaveBeenCalledWith({ where: { id: 3, companyId: 7 } });
  });

  it("prompt em uso não é excluído (400)", async () => {
    whatsappCount.mockResolvedValue(1);
    await expect(PromptController.remove({ params: { promptId: "2" }, user: admin }, response())).rejects.toMatchObject({
      message: "ERR_PROMPT_IN_USE",
      statusCode: 400
    });
  });

  it("chave da OpenAI fora do escopo padrão do Prompt", () => {
    const Prompt = jest.requireActual("../../models/Prompt").default;
    const { getScopeOptionsGetters } = require("sequelize-typescript/dist/scopes/scope-service");
    const getters = getScopeOptionsGetters(Prompt.prototype);
    expect(getters.getDefaultScope()).toEqual({ attributes: { exclude: ["apiKey"] } });
    expect(getters.getScopes().withKey).toEqual({ attributes: { include: ["apiKey"] } });
  });

  it("token da conexão só sai para o admin", () => {
    const whatsapp: any = { toJSON: () => ({ id: 1, name: "WA", session: "chaves", token: "segredo" }) };
    expect(withoutSession(whatsapp)).toEqual({ id: 1, name: "WA" });
    expect(withoutSession(whatsapp, true)).toEqual({ id: 1, name: "WA", token: "segredo" });
  });

  it("rotas de admin", () => {
    const guarded = (router: any, method: string, path: string) =>
      router.stack.find((l: any) => l.route?.path === path && l.route.methods[method]).route.stack.some((s: any) => s.name === "isAdmin");
    const files = require("../../routes/filesRoutes").default;
    const prompts = require("../../routes/promptRouter").default;
    const integrations = require("../../routes/queueIntegrationRoutes").default;
    const sessions = require("../../routes/whatsappSessionRoutes").default;
    expect(guarded(files, "delete", "/files")).toBe(true);
    expect(guarded(files, "post", "/files/uploadList/:fileListId")).toBe(true);
    expect(guarded(files, "get", "/files")).toBe(false);
    expect(guarded(prompts, "get", "/prompt")).toBe(true);
    expect(guarded(integrations, "get", "/queueIntegration/:integrationId")).toBe(true);
    expect(guarded(sessions, "delete", "/whatsappsession/:whatsappId")).toBe(true);
  });
});
