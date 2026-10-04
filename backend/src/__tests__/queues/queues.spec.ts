const upsertJobScheduler = jest.fn();
const workerNames: string[] = [];

jest.mock("ioredis", () => jest.fn().mockImplementation(() => ({ quit: jest.fn() })));
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation((name: string) => ({
    name,
    add: jest.fn(),
    upsertJobScheduler,
    close: jest.fn()
  })),
  Worker: jest.fn().mockImplementation((name: string) => {
    workerNames.push(name);
    return { on: jest.fn(), close: jest.fn() };
  })
}));
// Evita carregar o banco e o WhatsApp: só a orquestração das filas importa aqui.
jest.mock("../../database", () => ({ __esModule: true, default: {} }));
jest.mock("../../services/WbotServices/wbotClosedTickets", () => ({ ClosedAllOpenTickets: jest.fn() }));
jest.mock("../../wbotTransferTicketQueue", () => ({ TransferTicketQueue: jest.fn() }));
jest.mock("../../helpers/GetWhatsappWbot", () => jest.fn());
jest.mock("../../helpers/SendMessage", () => ({ SendMessage: jest.fn() }));
jest.mock("../../services/WbotServices/SendWhatsAppMedia", () => ({ getMessageOptions: jest.fn() }));
jest.mock("../../libs/socket", () => ({ getIO: jest.fn() }));

import { JOB_SCHEDULERS, startQueueProcess } from "../../queues";

describe("queues (BullMQ)", () => {
  // O jest.config usa clearMocks: as chamadas são copiadas antes de cada teste.
  let schedulerCalls: unknown[][] = [];
  beforeAll(async () => {
    await startQueueProcess();
    schedulerCalls = [...upsertJobScheduler.mock.calls];
  });

  it("registra um agendador por tarefa periódica, sem repetidos", () => {
    const ids = schedulerCalls.map(call => call[0]);
    expect(ids).toEqual(JOB_SCHEDULERS.map(s => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "verify-schedules",
        "verify-campaigns",
        "verify-login-status",
        "close-tickets",
        "transfer-tickets",
        "create-invoices"
      ])
    );
  });

  it("gera faturas a cada 5 minutos (antes: a cada 5 segundos)", () => {
    const invoices = schedulerCalls.find(call => call[0] === "create-invoices");
    expect(invoices[1]).toEqual({ pattern: "*/5 * * * *" });
  });

  it("inicia um worker por fila", () => {
    expect(workerNames.sort()).toEqual(
      ["CampaignQueue", "Maintenance", "MessageQueue", "SendSacheduledMessages"].sort()
    );
  });
});
