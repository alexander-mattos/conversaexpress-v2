// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const whatsappFindOne = jest.fn();
const whatsappFindByPk = jest.fn();
const companyFindByPk = jest.fn();
const invoiceFindByPk = jest.fn();
const createCharge = jest.fn();
const generateQr = jest.fn();
const detailCharge = jest.fn();
const emits: { event: string; payload: any }[] = [];

jest.mock("../../libs/socket", () => ({
  getIO: () => ({ to: () => ({ emit: (event: string, payload: any) => emits.push({ event, payload }) }) })
}));
jest.mock("../../models/Whatsapp", () => ({ __esModule: true, default: { findOne: whatsappFindOne, findByPk: whatsappFindByPk } }));
jest.mock("../../models/Company", () => ({ __esModule: true, default: { findByPk: companyFindByPk } }));
jest.mock("../../models/Message", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/Queue", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/User", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/Plan", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/Invoices", () => ({ __esModule: true, default: { findByPk: invoiceFindByPk } }));
jest.mock("../../models/Subscriptions", () => ({ __esModule: true, default: {} }));
jest.mock("../../config/Gn", () => ({ __esModule: true, default: {} }));
jest.mock("sdk-node-apis-efi", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    pixCreateImmediateCharge: createCharge,
    pixGenerateQRCode: generateQr,
    pixDetailCharge: detailCharge
  }))
}));
for (const path of [
  "services/WbotServices/CheckNumber",
  "services/WbotServices/GetProfilePicUrl",
  "services/ContactServices/CreateOrUpdateContactService",
  "services/TicketServices/FindOrCreateTicketService",
  "services/WbotServices/SendWhatsAppMessage",
  "services/TicketServices/UpdateTicketService",
  "helpers/SetTicketMessagesAsRead",
  "services/MessageServices/ListMessagesService",
  "services/WbotServices/SendWhatsAppMedia",
  "services/WbotServices/DeleteWhatsAppMessage",
  "services/TicketServices/ShowTicketService",
  "services/WbotServices/CheckIsValidContact"
]) {
  jest.doMock(`../../${path}`, () => ({ __esModule: true, default: jest.fn() }));
}

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const os = require("os");
const path = require("path");
const tokenAuth = require("../../middleware/tokenAuth").default;
const MessageController = require("../../controllers/MessageController");
const SubscriptionController = require("../../controllers/SubscriptionController");

const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  emits.length = 0;
});

describe("API de mensagens: token", () => {
  it("sem token, 'Bearer ' vazio ou 'null' é 401 sem consultar o banco", async () => {
    for (const authorization of [undefined, "", "Bearer ", "Bearer    ", "Bearer null", "qualquer"]) {
      const next = jest.fn();
      await expect(tokenAuth({ headers: { authorization }, params: {} }, response(), next)).rejects.toMatchObject({ statusCode: 401 });
      expect(next).not.toHaveBeenCalled();
    }
    expect(whatsappFindOne).not.toHaveBeenCalled();
  });

  it("token desconhecido é 401; válido segue com a conexão", async () => {
    whatsappFindOne.mockResolvedValue(null);
    await expect(tokenAuth({ headers: { authorization: "Bearer xyz" }, params: {} }, response(), jest.fn())).rejects.toMatchObject({ statusCode: 401 });
    whatsappFindOne.mockResolvedValue({ id: 3, companyId: 7 });
    const req: any = { headers: { authorization: "Bearer tok-valido" }, params: {} };
    const next = jest.fn();
    await tokenAuth(req, response(), next);
    expect(whatsappFindOne.mock.calls[1][0].where).toEqual({ token: "tok-valido" });
    expect(req.params.whatsappId).toBe("3");
    expect(next).toHaveBeenCalled();
  });
});

describe("API de mensagens: envio", () => {
  const send = (body: any, files?: any[]) => MessageController.send({ params: { whatsappId: 3 }, body, files }, response());

  beforeEach(() => whatsappFindByPk.mockResolvedValue({ id: 3, companyId: 7 }));

  it("plano sem API externa (403) e o anexo não fica no servidor", async () => {
    companyFindByPk.mockResolvedValue({ plan: { useExternalApi: false } });
    const file = path.join(os.tmpdir(), `api-${Date.now()}.txt`);
    fs.writeFileSync(file, "x");
    await expect(send({ number: "5511999999999" }, [{ path: file, originalname: "a.txt" }])).rejects.toMatchObject({ statusCode: 403 });
    expect(fs.existsSync(file)).toBe(false);
  });

  it("número e texto validados (400)", async () => {
    companyFindByPk.mockResolvedValue({ plan: { useExternalApi: true } });
    await expect(send({ number: "123", body: "oi" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(send({ number: "5511999999999", body: "   " })).rejects.toMatchObject({ statusCode: 400 });
    await expect(send({ number: "5511999999999", body: "x".repeat(5000) })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("cobrança (correções anteriores, agora com teste)", () => {
  it("Pix usa o valor da fatura do banco e só da própria empresa", async () => {
    invoiceFindByPk.mockResolvedValue({ id: 9, companyId: 8, value: 99, status: "open" });
    await expect(
      SubscriptionController.createSubscription({ user: { companyId: 7 }, body: { invoiceId: 9, price: 1 } }, response())
    ).rejects.toMatchObject({ statusCode: 403 });

    invoiceFindByPk.mockResolvedValue({ id: 9, companyId: 7, value: 99.9, status: "open" });
    createCharge.mockResolvedValue({ txid: "t1", loc: { id: 5 } });
    generateQr.mockResolvedValue({ qrcode: "000201...", imagemQrcode: "data:image/png;base64,x" });
    const res = response();
    await SubscriptionController.createSubscription({ user: { companyId: 7 }, body: { invoiceId: 9, price: 1 } }, res);
    expect(createCharge.mock.calls[0][0].valor.original).toBe("99.90");
    expect(res.json.mock.calls[0][0].qrcode.qrcode).toBe("000201...");
  });

  it("fatura já paga não gera Pix", async () => {
    invoiceFindByPk.mockResolvedValue({ id: 9, companyId: 7, value: 99, status: "paid" });
    await expect(SubscriptionController.createSubscription({ user: { companyId: 7 }, body: { invoiceId: 9 } }, response())).rejects.toMatchObject({
      statusCode: 400
    });
    expect(createCharge).not.toHaveBeenCalled();
  });

  it("webhook confere na Efí, recusa valor menor e não paga duas vezes", async () => {
    const invoice = { id: 9, companyId: 7, value: 99, status: "open", update: jest.fn() };
    const company = { id: 7, dueDate: "2026-10-01", update: jest.fn(), reload: jest.fn() };
    invoiceFindByPk.mockResolvedValue(invoice);
    companyFindByPk.mockResolvedValue(company);

    detailCharge.mockResolvedValue({ status: "CONCLUIDA", solicitacaoPagador: "#Fatura:9", valor: { original: "10.00" } });
    await SubscriptionController.webhook({ params: {}, body: { pix: [{ txid: "t1", valor: "99.00" }] } }, response());
    expect(invoice.update).not.toHaveBeenCalled();

    detailCharge.mockResolvedValue({ status: "CONCLUIDA", solicitacaoPagador: "#Fatura:9", valor: { original: "99.00" } });
    await SubscriptionController.webhook({ params: {}, body: { pix: [{ txid: "t1" }] } }, response());
    expect(invoice.update).toHaveBeenCalledWith({ status: "paid" });
    expect(company.update).toHaveBeenCalledWith({ dueDate: "2026-10-31" });
    expect(emits[0].event).toBe("company-7-payment");

    invoice.update.mockClear();
    invoiceFindByPk.mockResolvedValue({ ...invoice, status: "paid" });
    await SubscriptionController.webhook({ params: {}, body: { pix: [{ txid: "t1" }] } }, response());
    expect(invoice.update).not.toHaveBeenCalled();
  });
});
