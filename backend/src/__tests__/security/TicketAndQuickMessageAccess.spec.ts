const findService = jest.fn();
const showTicketService = jest.fn();
const deleteTicketService = jest.fn();
const emit = jest.fn();
const to = jest.fn();

jest.mock("../../services/QuickMessageService/FindService", () => ({ __esModule: true, default: findService }));
jest.mock("../../services/TicketServices/ShowTicketService", () => ({ __esModule: true, default: showTicketService }));
jest.mock("../../services/TicketServices/DeleteTicketService", () => ({ __esModule: true, default: deleteTicketService }));
jest.mock("../../libs/socket", () => ({
  getIO: () => ({ to }),
  queueRoom: (queueId: number | null, companyId: number, suffix: string) =>
    queueId ? `queue-${queueId}-${suffix}` : `company-${companyId}-queue-null-${suffix}`
}));

// Os demais serviços dos controllers importam o Baileys (ESM): ficam isolados.
for (const service of [
  "TicketServices/CreateTicketService",
  "TicketServices/ListTicketsService",
  "TicketServices/ShowTicketFromUUIDService",
  "TicketServices/UpdateTicketService",
  "TicketServices/ListTicketsServiceKanban",
  "QuickMessageService/ListService",
  "QuickMessageService/CreateService",
  "QuickMessageService/ShowService",
  "QuickMessageService/UpdateService",
  "QuickMessageService/DeleteService"
]) {
  jest.doMock(`../../services/${service}`, () => ({ __esModule: true, default: jest.fn() }));
}
jest.mock("../../helpers/CompanyAccess", () => ({ assertCompanyAccess: jest.fn(), assertRecordInCompany: jest.fn() }));
jest.mock("../../models/Ticket", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/QuickMessage", () => ({ __esModule: true, default: {} }));

/* eslint-disable @typescript-eslint/no-var-requires */
const { findList } = require("../../controllers/QuickMessageController");
const { remove } = require("../../controllers/TicketController");

const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe("respostas rápidas: empresa sempre do token", () => {
  it("ignora o companyId da URL", async () => {
    findService.mockResolvedValue([]);
    const req: any = { query: { companyId: "99", userId: "5" }, user: { id: "5", companyId: 1, profile: "user" } };

    await findList(req, response());

    expect(findService).toHaveBeenCalledWith({ companyId: "1", userId: "5" });
  });
});

describe("excluir ticket: só admin", () => {
  beforeEach(() => {
    to.mockImplementation(() => ({ to, emit }));
  });

  it("recusa perfil user com 403 e não exclui", async () => {
    const req: any = { params: { ticketId: "7" }, user: { id: "5", companyId: 1, profile: "user" } };

    await expect(remove(req, response())).rejects.toMatchObject({ message: "ERR_NO_PERMISSION", statusCode: 403 });
    expect(showTicketService).not.toHaveBeenCalled();
    expect(deleteTicketService).not.toHaveBeenCalled();
  });

  it("permite admin e avisa os clientes", async () => {
    showTicketService.mockResolvedValue({ id: 7 });
    deleteTicketService.mockResolvedValue({ id: 7, status: "open", queueId: 2 });
    const req: any = { params: { ticketId: "7" }, user: { id: "1", companyId: 1, profile: "admin" } };
    const res = response();

    await remove(req, res);

    expect(showTicketService).toHaveBeenCalledWith("7", 1);
    expect(deleteTicketService).toHaveBeenCalledWith("7");
    expect(emit).toHaveBeenCalledWith("company-1-ticket", { action: "delete", ticketId: 7 });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
