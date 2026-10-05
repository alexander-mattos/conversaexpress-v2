// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const integrationFind = jest.fn();
const promptFind = jest.fn();
const queueFind = jest.fn();
const queueCount = jest.fn();
const optionFind = jest.fn();
const userFind = jest.fn();
const userCount = jest.fn();
const whatsappFind = jest.fn();
const createQueue = jest.fn();
const createOption = jest.fn();
const showUser = jest.fn();
const updateUser = jest.fn();
const deleteUser = jest.fn();

jest.mock("../../middleware/isAuth", () => ({ __esModule: true, default: function isAuth() {} }));
jest.mock("../../libs/socket", () => ({ getIO: () => ({ to: () => ({ emit: jest.fn() }) }) }));
jest.mock("../../models/QueueIntegrations", () => ({ __esModule: true, default: { findByPk: integrationFind } }));
jest.mock("../../models/Prompt", () => ({ __esModule: true, default: { findByPk: promptFind } }));
jest.mock("../../models/Queue", () => ({ __esModule: true, default: { findByPk: queueFind, count: queueCount } }));
jest.mock("../../models/QueueOption", () => ({ __esModule: true, default: { findByPk: optionFind } }));
jest.mock("../../models/User", () => ({ __esModule: true, default: { findByPk: userFind, count: userCount, findOne: jest.fn() } }));
jest.mock("../../models/Whatsapp", () => ({ __esModule: true, default: { findByPk: whatsappFind } }));
jest.mock("../../services/QueueService/CreateQueueService", () => ({ __esModule: true, default: createQueue }));
jest.mock("../../services/QueueOptionService/CreateService", () => ({ __esModule: true, default: createOption }));
jest.mock("../../services/UserServices/ShowUserService", () => ({ __esModule: true, default: showUser }));
jest.mock("../../services/UserServices/UpdateUserService", () => ({ __esModule: true, default: updateUser }));
jest.mock("../../services/UserServices/DeleteUserService", () => ({ __esModule: true, default: deleteUser }));
for (const service of [
  "QueueService/DeleteQueueService",
  "QueueService/ListQueuesService",
  "QueueService/ShowQueueService",
  "QueueService/UpdateQueueService",
  "QueueOptionService/ListService",
  "QueueOptionService/UpdateService",
  "QueueOptionService/ShowService",
  "QueueOptionService/DeleteService",
  "UserServices/CreateUserService",
  "UserServices/ListUsersService",
  "UserServices/SimpleListService",
  "UserServices/SetLanguageCompanyService"
]) {
  jest.doMock(`../../services/${service}`, () => ({ __esModule: true, default: jest.fn() }));
}

/* eslint-disable @typescript-eslint/no-var-requires */
const QueueController = require("../../controllers/QueueController");
const QueueOptionController = require("../../controllers/QueueOptionController");
const UserController = require("../../controllers/UserController");
const { parseQueueSchedules } = require("../../helpers/QueueSchedules");
const { assertUserRefs } = require("../../helpers/UserRefs");

const record = (companyId: number, extra: Record<string, unknown> = {}) => ({ get: () => companyId, companyId, ...extra });
const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const admin = { id: 1, companyId: 7, profile: "admin" };

beforeEach(() => {
  jest.clearAllMocks();
  userFind.mockResolvedValue({ super: false });
});

describe("filas: integração, prompt e horários", () => {
  it("recusa integração de outra empresa", async () => {
    integrationFind.mockResolvedValue(record(99));
    const req: any = { body: { name: "Fila", color: "#fff", integrationId: 3 }, user: admin };
    await expect(QueueController.store(req, response())).rejects.toMatchObject({ statusCode: 403 });
    expect(createQueue).not.toHaveBeenCalled();
  });

  it("recusa prompt inexistente", async () => {
    promptFind.mockResolvedValue(null);
    const req: any = { body: { name: "Fila", color: "#fff", promptId: 3 }, user: admin };
    await expect(QueueController.store(req, response())).rejects.toMatchObject({ statusCode: 404 });
  });

  it("aceita horários válidos e recusa os inválidos", () => {
    const day = { weekday: "Segunda-feira", weekdayEn: "monday", startTime: "08:00", endTime: "18:00" };
    expect(parseQueueSchedules([day])).toEqual([day]);
    expect(parseQueueSchedules(undefined)).toBeUndefined();
    expect(() => parseQueueSchedules([{ ...day, startTime: "25:00" }])).toThrow("ERR_QUEUE_INVALID_SCHEDULES");
    expect(() => parseQueueSchedules([{ ...day, weekdayEn: "funday" }])).toThrow("ERR_QUEUE_INVALID_SCHEDULES");
    expect(() => parseQueueSchedules("x")).toThrow("ERR_QUEUE_INVALID_SCHEDULES");
  });
});

describe("opções do chatbot", () => {
  it("lista sem fila é recusada (antes trazia todas as empresas)", async () => {
    const req: any = { query: {}, user: admin };
    await expect(QueueOptionController.index(req, response())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("cria só com os campos permitidos", async () => {
    queueFind.mockResolvedValue(record(7));
    createOption.mockResolvedValue({ id: 1 });
    const req: any = { body: { title: "Vendas", option: "1", queueId: 5, id: 99, companyId: 1, edition: true }, user: admin };
    await QueueOptionController.store(req, response());
    expect(createOption).toHaveBeenCalledWith({ title: "Vendas", option: "1", queueId: 5 });
  });

  it("recusa fila inexistente e pai de outra fila", async () => {
    queueFind.mockResolvedValue(null);
    await expect(QueueOptionController.store({ body: { title: "A", option: "1", queueId: 5 }, user: admin }, response())).rejects.toMatchObject({ statusCode: 404 });
    queueFind.mockResolvedValue(record(7));
    optionFind.mockResolvedValue({ id: 8, queueId: 6 });
    await expect(
      QueueOptionController.store({ body: { title: "A", option: "1", queueId: 5, parentId: 8 }, user: admin }, response())
    ).rejects.toMatchObject({ message: "ERR_QUEUE_OPTION_INVALID_PARENT" });
    expect(createOption).not.toHaveBeenCalled();
  });
});

describe("usuários", () => {
  it("perfil desconhecido, fila e conexão de outra empresa são recusados", async () => {
    await expect(assertUserRefs({ profile: "root" }, 7)).rejects.toMatchObject({ message: "ERR_INVALID_PROFILE" });
    queueCount.mockResolvedValue(1);
    await expect(assertUserRefs({ queueIds: [1, 2] }, 7)).rejects.toMatchObject({ statusCode: 403 });
    whatsappFind.mockResolvedValue({ companyId: 99 });
    await expect(assertUserRefs({ whatsappId: 3 }, 7)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("não rebaixa o último admin", async () => {
    showUser.mockResolvedValue({ id: 2, companyId: 7, profile: "admin" });
    userCount.mockResolvedValue(0);
    const req: any = { params: { userId: 2 }, body: { profile: "user" }, user: admin };
    await expect(UserController.update(req, response())).rejects.toMatchObject({ message: "ERR_LAST_ADMIN" });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("não exclui a si mesmo", async () => {
    const req: any = { params: { userId: "1" }, user: admin };
    await expect(UserController.remove(req, response())).rejects.toMatchObject({ message: "ERR_CANNOT_DELETE_SELF" });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("show não devolve tokenVersion", async () => {
    showUser.mockResolvedValue({ companyId: 7, toJSON: () => ({ id: 2, name: "Ana", tokenVersion: 3 }) });
    const res = response();
    await UserController.show({ params: { userId: 2 }, user: admin }, res);
    expect(res.json).toHaveBeenCalledWith({ id: 2, name: "Ana" });
  });
});

describe("rotas só para admin", () => {
  const guarded = (router: any, method: string, path: string) => {
    const layer = router.stack.find((l: any) => l.route?.path === path && l.route.methods[method]);
    return layer.route.stack.some((s: any) => s.name === "isAdmin");
  };

  it("escritas de filas, opções e idioma da empresa", () => {
    const queueRoutes = require("../../routes/queueRoutes").default;
    const optionRoutes = require("../../routes/queueOptionRoutes").default;
    const userRoutes = require("../../routes/userRoutes").default;
    expect(guarded(queueRoutes, "post", "/queue")).toBe(true);
    expect(guarded(queueRoutes, "put", "/queue/:queueId")).toBe(true);
    expect(guarded(queueRoutes, "delete", "/queue/:queueId")).toBe(true);
    expect(guarded(queueRoutes, "get", "/queue")).toBe(false);
    expect(guarded(optionRoutes, "post", "/queue-options")).toBe(true);
    expect(guarded(optionRoutes, "put", "/queue-options/:queueOptionId")).toBe(true);
    expect(guarded(optionRoutes, "delete", "/queue-options/:queueOptionId")).toBe(true);
    expect(guarded(userRoutes, "post", "/users/set-language/:newLanguage")).toBe(true);
    expect(guarded(userRoutes, "put", "/users/me")).toBe(false);
  });
});
