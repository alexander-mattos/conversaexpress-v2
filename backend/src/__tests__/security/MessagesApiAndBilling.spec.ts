// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const whatsappFindOne = jest.fn();
const whatsappFindByPk = jest.fn();
const companyFindByPk = jest.fn();
const invoiceFindByPk = jest.fn();
const asaas = {
  createCustomer: jest.fn(),
  createPayment: jest.fn(),
  getPayment: jest.fn(),
  getPixQrCode: jest.fn()
};
const transaction = jest.fn(async (fn: any) => fn({ LOCK: { UPDATE: "UPDATE" } }));
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
jest.mock("../../models/Invoices", () => ({
  __esModule: true,
  default: { findByPk: invoiceFindByPk, sequelize: { transaction } }
}));
jest.mock("../../services/BillingServices/AsaasClient", () => asaas);
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

describe("cobrança pelo Asaas", () => {
  const CPF = "529.982.247-25";
  const subscribe = (body: any, res = response()) =>
    SubscriptionController.createSubscription({ user: { companyId: 7 }, body }, res).then(() => res);
  const makeCompany = (extra: any = {}) => {
    const company: any = { id: 7, name: "Empresa", email: "a@b.com", document: null, asaasCustomerId: null, dueDate: "2026-10-01", ...extra };
    company.update = jest.fn(async (data: any) => Object.assign(company, data));
    company.reload = jest.fn();
    return company;
  };
  const makeInvoice = (extra: any = {}) => {
    const invoice: any = { id: 9, companyId: 7, value: 99.9, status: "open", dueDate: "2999-01-10T00:00:00", ...extra };
    invoice.update = jest.fn(async (data: any) => Object.assign(invoice, data));
    return invoice;
  };

  beforeEach(() => {
    process.env.ASAAS_WEBHOOK_TOKEN = "segredo-do-webhook";
    asaas.createCustomer.mockResolvedValue({ id: "cus_1" });
    asaas.createPayment.mockResolvedValue({ id: "pay_1", status: "PENDING", customer: "cus_1", value: 99.9, invoiceUrl: "https://asaas/i/pay_1" });
    asaas.getPixQrCode.mockResolvedValue({ payload: "000201...", encodedImage: "base64", expirationDate: "2999-01-10" });
  });

  it("fatura de outra empresa é 403 e fatura paga é 400, sem chamar o Asaas", async () => {
    invoiceFindByPk.mockResolvedValue(makeInvoice({ companyId: 8 }));
    await expect(subscribe({ invoiceId: 9 })).rejects.toMatchObject({ statusCode: 403 });
    invoiceFindByPk.mockResolvedValue(makeInvoice({ status: "paid" }));
    await expect(subscribe({ invoiceId: 9 })).rejects.toMatchObject({ statusCode: 400 });
    expect(asaas.createPayment).not.toHaveBeenCalled();
  });

  it("sem CPF/CNPJ válido é 400; com documento grava, cria o cliente e cobra o valor do banco", async () => {
    const company = makeCompany();
    companyFindByPk.mockResolvedValue(company);
    invoiceFindByPk.mockResolvedValue(makeInvoice());
    await expect(subscribe({ invoiceId: 9 })).rejects.toMatchObject({ statusCode: 400, message: "ERR_DOCUMENT_REQUIRED" });
    await expect(subscribe({ invoiceId: 9, cpfCnpj: "111.111.111-11" })).rejects.toMatchObject({ statusCode: 400 });
    expect(asaas.createCustomer).not.toHaveBeenCalled();

    const invoice = makeInvoice();
    invoiceFindByPk.mockResolvedValue(invoice);
    const res = await subscribe({ invoiceId: 9, cpfCnpj: CPF, value: 1 });
    expect(company.document).toBe("52998224725");
    expect(asaas.createCustomer.mock.calls[0][0]).toMatchObject({ cpfCnpj: "52998224725", externalReference: "7" });
    expect(company.asaasCustomerId).toBe("cus_1");
    expect(asaas.createPayment.mock.calls[0][0]).toMatchObject({
      customer: "cus_1",
      value: 99.9,
      dueDate: "2999-01-10",
      externalReference: "9"
    });
    expect(invoice.providerPaymentId).toBe("pay_1");
    expect(res.json.mock.calls[0][0]).toEqual({
      pix: { payload: "000201...", encodedImage: "base64", expirationDate: "2999-01-10" },
      invoiceUrl: "https://asaas/i/pay_1"
    });
  });

  it("fatura vencida vence hoje; cobrança pendente é reaproveitada, paga ou cancelada não", async () => {
    companyFindByPk.mockResolvedValue(makeCompany({ document: "52998224725", asaasCustomerId: "cus_1" }));
    invoiceFindByPk.mockResolvedValue(makeInvoice({ dueDate: "2020-01-01" }));
    await subscribe({ invoiceId: 9 });
    expect(asaas.createPayment.mock.calls[0][0].dueDate).toBe(new Date().toISOString().split("T")[0]);

    asaas.createPayment.mockClear();
    invoiceFindByPk.mockResolvedValue(makeInvoice({ providerPaymentId: "pay_1" }));
    asaas.getPayment.mockResolvedValue({ id: "pay_1", status: "PENDING", customer: "cus_1", value: 99.9, invoiceUrl: "u" });
    await subscribe({ invoiceId: 9 });
    expect(asaas.createPayment).not.toHaveBeenCalled();
    expect(asaas.getPixQrCode).toHaveBeenLastCalledWith("pay_1");

    asaas.getPayment.mockResolvedValue({ id: "pay_1", status: "REFUNDED", customer: "cus_1", value: 99.9 });
    await subscribe({ invoiceId: 9 });
    expect(asaas.createPayment).toHaveBeenCalledTimes(1);
  });

  describe("webhook", () => {
    const hook = (body: any, headers: any = { "asaas-access-token": "segredo-do-webhook" }) =>
      SubscriptionController.webhook({ headers, body }, response());
    const paidEvent = { event: "PAYMENT_RECEIVED", payment: { id: "pay_1", status: "RECEIVED", value: 99.9 } };

    it("sem token, token errado ou sem token configurado é 401", async () => {
      await expect(hook(paidEvent, {})).rejects.toMatchObject({ statusCode: 401 });
      await expect(hook(paidEvent, { "asaas-access-token": "outro" })).rejects.toMatchObject({ statusCode: 401 });
      process.env.ASAAS_WEBHOOK_TOKEN = "";
      await expect(hook(paidEvent, { "asaas-access-token": "" })).rejects.toMatchObject({ statusCode: 401 });
      expect(asaas.getPayment).not.toHaveBeenCalled();
    });

    it("confere no Asaas: status, cliente e valor do corpo não valem", async () => {
      const invoice = makeInvoice();
      const company = makeCompany({ asaasCustomerId: "cus_1" });
      invoiceFindByPk.mockResolvedValue(invoice);
      companyFindByPk.mockResolvedValue(company);

      asaas.getPayment.mockResolvedValue({ id: "pay_1", status: "PENDING", customer: "cus_1", value: 99.9, externalReference: "9" });
      await hook(paidEvent);
      asaas.getPayment.mockResolvedValue({ id: "pay_1", status: "RECEIVED", customer: "cus_outro", value: 99.9, externalReference: "9" });
      await hook(paidEvent);
      asaas.getPayment.mockResolvedValue({ id: "pay_1", status: "RECEIVED", customer: "cus_1", value: 10, externalReference: "9" });
      await hook(paidEvent);
      await hook({ event: "PAYMENT_CREATED", payment: { id: "pay_1" } });
      expect(invoice.update).not.toHaveBeenCalled();
      expect(company.update).not.toHaveBeenCalled();
    });

    it("dá baixa uma vez só, com lock, e soma 30 dias", async () => {
      const invoice = makeInvoice();
      const company = makeCompany({ asaasCustomerId: "cus_1" });
      invoiceFindByPk.mockResolvedValue(invoice);
      companyFindByPk.mockResolvedValue(company);
      asaas.getPayment.mockResolvedValue({ id: "pay_1", status: "CONFIRMED", customer: "cus_1", value: 99.9, externalReference: "9" });

      await hook({ ...paidEvent, event: "PAYMENT_CONFIRMED" });
      await hook(paidEvent);
      expect(invoiceFindByPk.mock.calls[0][1]).toMatchObject({ lock: "UPDATE" });
      expect(invoice.update).toHaveBeenCalledTimes(1);
      expect(invoice.update.mock.calls[0][0]).toEqual({ status: "paid" });
      expect(company.update).toHaveBeenCalledTimes(1);
      expect(company.update.mock.calls[0][0]).toEqual({ dueDate: "2026-10-31" });
      expect(emits.map(e => e.event)).toEqual(["company-7-payment"]);
    });
  });
});
