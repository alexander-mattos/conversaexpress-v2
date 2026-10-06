// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const ticketFindOne = jest.fn();
const ticketFindAndCountAll = jest.fn();
const tagFindByPk = jest.fn();
const tagFindAll = jest.fn();
const ticketTagDestroy = jest.fn();
const ticketTagCreate = jest.fn();
const ticketTagFindOrCreate = jest.fn();
const ticketTagFindAll = jest.fn();
const userQueueFindAll = jest.fn();
const companyFindByPk = jest.fn();
const userFindByPk = jest.fn();
const showTicket = jest.fn();
const emits: { rooms: string[]; event: string; payload: any }[] = [];

jest.mock("../../libs/socket", () => ({
  queueRoom: (queueId: number | null, companyId: number, suffix: string) =>
    queueId ? `queue-${queueId}-${suffix}` : `company-${companyId}-queue-null-${suffix}`,
  getIO: () => {
    const rooms: string[] = [];
    const chain: any = {
      to: (room: string) => {
        rooms.push(room);
        return chain;
      },
      emit: (event: string, payload: any) => emits.push({ rooms, event, payload })
    };
    return chain;
  }
}));
jest.mock("../../database", () => ({ __esModule: true, default: { transaction: (fn: any) => fn("tx") } }));
jest.mock("../../models/Ticket", () => ({
  __esModule: true,
  default: { findOne: ticketFindOne, findAndCountAll: ticketFindAndCountAll }
}));
jest.mock("../../models/Tag", () => ({ __esModule: true, default: { findByPk: tagFindByPk, findAll: tagFindAll } }));
jest.mock("../../models/TicketTag", () => ({
  __esModule: true,
  default: { destroy: ticketTagDestroy, create: ticketTagCreate, findOrCreate: ticketTagFindOrCreate, findAll: ticketTagFindAll }
}));
jest.mock("../../models/UserQueue", () => ({ __esModule: true, default: { findAll: userQueueFindAll } }));
jest.mock("../../models/Company", () => ({ __esModule: true, default: { findByPk: companyFindByPk } }));
jest.mock("../../models/Plan", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/User", () => ({ __esModule: true, default: { findByPk: userFindByPk } }));
for (const model of ["Contact", "Queue", "Whatsapp"]) {
  jest.doMock(`../../models/${model}`, () => ({ __esModule: true, default: {} }));
}
jest.mock("../../services/TicketServices/ShowTicketService", () => ({ __esModule: true, default: showTicket }));

/* eslint-disable @typescript-eslint/no-var-requires */
const { Op } = require("sequelize");
const TicketTagController = require("../../controllers/TicketTagController");
const ListTicketsServiceKanban = require("../../services/TicketServices/ListTicketsServiceKanban").default;
const { parseIdList, allowedQueueIds, canSeeTicket } = require("../../helpers/KanbanAccess");

const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const atendente = { id: 5, companyId: 7, profile: "user" };
const admin = { id: 1, companyId: 7, profile: "admin" };
const move = (user: any, ticketId: string, tagId: unknown) =>
  TicketTagController.kanban({ params: { ticketId }, body: { tagId }, user }, response());

beforeEach(() => {
  jest.clearAllMocks();
  emits.length = 0;
  companyFindByPk.mockResolvedValue({ plan: { useKanban: true } });
  userFindByPk.mockResolvedValue({ id: 1, super: false });
  userQueueFindAll.mockResolvedValue([{ queueId: 3 }]);
  tagFindAll.mockResolvedValue([{ id: 20 }, { id: 21 }]);
  showTicket.mockResolvedValue({ id: 50, status: "pending", queueId: 3, userId: null, tags: [] });
});

describe("kanban: mover ticket de coluna", () => {
  it("ticket de outra empresa não é encontrado (404) e nada muda", async () => {
    ticketFindOne.mockResolvedValue(null);
    await expect(move(admin, "50", 20)).rejects.toMatchObject({ statusCode: 404 });
    expect(ticketFindOne.mock.calls[0][0].where).toMatchObject({ id: "50", companyId: 7 });
    expect(ticketTagDestroy).not.toHaveBeenCalled();
  });

  it("tag de outra empresa (403)", async () => {
    ticketFindOne.mockResolvedValue({ id: 50, status: "pending", queueId: 3, userId: null });
    tagFindByPk.mockResolvedValue({ id: 99, companyId: 8, kanban: 1 });
    await expect(move(admin, "50", 99)).rejects.toMatchObject({ statusCode: 403 });
    expect(ticketTagCreate).not.toHaveBeenCalled();
  });

  it("tag comum não é coluna (400)", async () => {
    ticketFindOne.mockResolvedValue({ id: 50, status: "pending", queueId: 3, userId: null });
    tagFindByPk.mockResolvedValue({ id: 30, companyId: 7, kanban: 0 });
    await expect(move(admin, "50", 30)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("atendente não move ticket de fila que não é dele (403)", async () => {
    ticketFindOne.mockResolvedValue({ id: 50, status: "pending", queueId: 4, userId: null });
    await expect(move(atendente, "50", 20)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("atendente não move ticket aberto de outro usuário (403)", async () => {
    ticketFindOne.mockResolvedValue({ id: 50, status: "open", queueId: 3, userId: 9 });
    await expect(move(atendente, "50", 20)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("plano sem Kanban (403)", async () => {
    companyFindByPk.mockResolvedValue({ plan: { useKanban: false } });
    await expect(move(admin, "50", 20)).rejects.toMatchObject({ statusCode: 403 });
    expect(ticketFindOne).not.toHaveBeenCalled();
  });

  it("super acessa o Kanban mesmo com o plano sem o recurso", async () => {
    companyFindByPk.mockResolvedValue({ plan: { useKanban: false } });
    userFindByPk.mockResolvedValue({ id: 1, super: true });
    ticketFindOne.mockResolvedValue({ id: 50, status: "pending", queueId: 3, userId: null });
    tagFindByPk.mockResolvedValue({ id: 20, companyId: 7, kanban: 1 });
    await move(admin, "50", 20);
    expect(ticketTagCreate).toHaveBeenCalledWith({ ticketId: 50, tagId: 20 }, { transaction: "tx" });
  });

  it("troca só as tags de kanban, mantém as comuns e avisa ao vivo", async () => {
    ticketFindOne.mockResolvedValue({ id: 50, status: "pending", queueId: 3, userId: null });
    tagFindByPk.mockResolvedValue({ id: 21, companyId: 7, kanban: 1 });
    await move(atendente, "50", 21);
    expect(ticketTagDestroy).toHaveBeenCalledWith({ where: { ticketId: 50, tagId: [20, 21] }, transaction: "tx" });
    expect(ticketTagCreate).toHaveBeenCalledWith({ ticketId: 50, tagId: 21 }, { transaction: "tx" });
    expect(emits[0].event).toBe("company-7-ticket");
    expect(emits[0].payload.action).toBe("update");
    expect(emits[0].rooms).toContain("queue-3-pending");
  });

  it("tagId null volta para Em aberto", async () => {
    ticketFindOne.mockResolvedValue({ id: 50, status: "open", queueId: 3, userId: 5 });
    await move(atendente, "50", null);
    expect(ticketTagDestroy).toHaveBeenCalled();
    expect(ticketTagCreate).not.toHaveBeenCalled();
  });
});

describe("kanban: rotas antigas", () => {
  it("PUT não aceita tag de outra empresa e não duplica", async () => {
    ticketFindOne.mockResolvedValue({ id: 50, status: "pending", queueId: 3, userId: null });
    tagFindByPk.mockResolvedValue({ id: 99, companyId: 8 });
    await expect(
      TicketTagController.store({ params: { ticketId: "50", tagId: "99" }, user: admin }, response())
    ).rejects.toMatchObject({ statusCode: 403 });

    tagFindByPk.mockResolvedValue({ id: 20, companyId: 7 });
    ticketTagFindOrCreate.mockResolvedValue([{ ticketId: 50, tagId: 20 }, false]);
    await TicketTagController.store({ params: { ticketId: "50", tagId: "20" }, user: admin }, response());
    expect(ticketTagFindOrCreate).toHaveBeenCalledWith({ where: { ticketId: 50, tagId: 20 } });
  });

  it("DELETE de ticket de outra empresa (404)", async () => {
    ticketFindOne.mockResolvedValue(null);
    await expect(TicketTagController.remove({ params: { ticketId: "50" }, user: admin }, response())).rejects.toMatchObject({
      statusCode: 404
    });
    expect(ticketTagDestroy).not.toHaveBeenCalled();
  });
});

describe("kanban: lista", () => {
  const conditionsOf = () => ticketFindAndCountAll.mock.calls[0][0].where[Op.and];

  beforeEach(() => ticketFindAndCountAll.mockResolvedValue({ count: 0, rows: [] }));

  it("showAll de não-admin é ignorado e as filas pedidas são cruzadas com as dele", async () => {
    await ListTicketsServiceKanban({ user: atendente, companyId: 7, showAll: "true", queueIds: [3, 4], tags: [], users: [] });
    const visibility = conditionsOf()[2][Op.or];
    expect(visibility[0]).toEqual({ userId: 5 });
    expect(visibility[1][Op.or][0].queueId[Op.in]).toEqual([3]);
  });

  it("showAll do admin vê a empresa toda, mas só da empresa", async () => {
    await ListTicketsServiceKanban({ user: admin, companyId: 7, showAll: "true", queueIds: [], tags: [], users: [] });
    expect(conditionsOf()).toHaveLength(2);
    expect(conditionsOf()[0]).toEqual({ companyId: 7 });
  });

  it("busca e não lidas somam filtros, sem tirar a visibilidade", async () => {
    await ListTicketsServiceKanban({
      user: atendente,
      companyId: 7,
      searchParam: "ana",
      withUnreadMessages: "true",
      queueIds: [],
      tags: [],
      users: []
    });
    expect(conditionsOf()).toHaveLength(5);
    expect(conditionsOf()[2][Op.or][0]).toEqual({ userId: 5 });
  });

  it("filtros inválidos são 400", () => {
    expect(() => parseIdList("not-json")).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => parseIdList('{"a":1}')).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(parseIdList("[1,1,2]")).toEqual([1, 2]);
    expect(allowedQueueIds([3], [])).toEqual([3]);
  });

  it("regra de visibilidade", () => {
    expect(canSeeTicket({ status: "open", userId: 5, queueId: 9 }, atendente, [3])).toBe(true);
    expect(canSeeTicket({ status: "pending", userId: null, queueId: null }, atendente, [3])).toBe(true);
    expect(canSeeTicket({ status: "pending", userId: null, queueId: 9 }, atendente, [3])).toBe(false);
    expect(canSeeTicket({ status: "open", userId: 9, queueId: 3 }, admin, [])).toBe(true);
  });
});
