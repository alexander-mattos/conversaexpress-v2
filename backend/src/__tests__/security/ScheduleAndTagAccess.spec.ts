const contactFind = jest.fn();
const userFind = jest.fn();
const ticketFind = jest.fn();
const tagCount = jest.fn();
const destroy = jest.fn();
const bulkCreate = jest.fn();
const createSchedule = jest.fn();

jest.mock("../../libs/socket", () => ({ getIO: () => ({ to: () => ({ emit: jest.fn() }) }) }));
jest.mock("../../models/Contact", () => ({ __esModule: true, default: { findByPk: contactFind } }));
jest.mock("../../models/User", () => ({ __esModule: true, default: { findByPk: userFind } }));
jest.mock("../../models/Ticket", () => ({ __esModule: true, default: { findByPk: ticketFind } }));
jest.mock("../../models/Tag", () => ({ __esModule: true, default: { count: tagCount } }));
jest.mock("../../models/TicketTag", () => ({ __esModule: true, default: { destroy, bulkCreate } }));
jest.mock("../../models/Schedule", () => ({ __esModule: true, default: {} }));
jest.mock("../../services/ScheduleServices/CreateService", () => ({ __esModule: true, default: createSchedule }));
for (const mod of ["ListService", "UpdateService", "ShowService", "DeleteService"]) {
  jest.doMock(`../../services/ScheduleServices/${mod}`, () => ({ __esModule: true, default: jest.fn() }));
}

/* eslint-disable @typescript-eslint/no-var-requires */
const { store } = require("../../controllers/ScheduleController");
const SyncTags = require("../../services/TagServices/SyncTagsService").default;

const record = (companyId: number) => ({ get: () => companyId });
const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const admin = { id: 1, companyId: 7, profile: "admin" };

describe("agendamento: ids do corpo precisam ser da empresa", () => {
  beforeEach(() => userFind.mockImplementation(async (id: number) => (id === 1 ? { super: false, ...record(7) } : record(7))));

  it("recusa contato de outra empresa", async () => {
    contactFind.mockResolvedValue(record(99));
    const req: any = { body: { body: "Oi", sendAt: "2026-10-05T10:00", contactId: 50, userId: 1 }, user: admin };
    await expect(store(req, response())).rejects.toMatchObject({ message: "ERR_NO_PERMISSION", statusCode: 403 });
    expect(createSchedule).not.toHaveBeenCalled();
  });

  it("aceita contato e usuário da empresa", async () => {
    contactFind.mockResolvedValue(record(7));
    createSchedule.mockResolvedValue({ id: 1 });
    const req: any = { body: { body: "Oi", sendAt: "2026-10-05T10:00", contactId: 5, userId: 1 }, user: admin };
    await store(req, response());
    expect(createSchedule).toHaveBeenCalledWith(expect.objectContaining({ contactId: 5, companyId: 7 }));
  });
});

describe("/tags/sync: ticket e tags da empresa", () => {
  const ticket = (companyId: number) => ({ companyId, reload: jest.fn() });

  it("recusa ticket de outra empresa", async () => {
    ticketFind.mockResolvedValue(ticket(99));
    await expect(SyncTags({ ticketId: 1, tags: [], companyId: 7 })).rejects.toMatchObject({ statusCode: 403 });
    expect(destroy).not.toHaveBeenCalled();
  });

  it("recusa tag de outra empresa", async () => {
    ticketFind.mockResolvedValue(ticket(7));
    tagCount.mockResolvedValue(1);
    await expect(SyncTags({ ticketId: 1, tags: [{ id: 1 }, { id: 2 }], companyId: 7 })).rejects.toMatchObject({ statusCode: 403 });
    expect(destroy).not.toHaveBeenCalled();
  });

  it("sincroniza quando tudo é da empresa", async () => {
    ticketFind.mockResolvedValue(ticket(7));
    tagCount.mockResolvedValue(2);
    await SyncTags({ ticketId: 1, tags: [{ id: 1 }, { id: 2 }], companyId: 7 });
    expect(destroy).toHaveBeenCalledWith({ where: { ticketId: 1 } });
    expect(bulkCreate).toHaveBeenCalledWith([
      { tagId: 1, ticketId: 1 },
      { tagId: 2, ticketId: 1 }
    ]);
  });
});
