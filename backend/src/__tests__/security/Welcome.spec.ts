export {};

const sendMail = jest.fn();
const isMailConfigured = jest.fn();
const getDefaultWhatsApp = jest.fn();
const onWhatsApp = jest.fn();
const sendMessage = jest.fn();

jest.mock("../../helpers/Mail", () => ({ sendMail, isMailConfigured }));
jest.mock("../../helpers/GetDefaultWhatsApp", () => ({ __esModule: true, default: getDefaultWhatsApp }));
jest.mock("../../libs/wbot", () => ({ getWbot: () => ({ onWhatsApp }) }));
jest.mock("../../helpers/SendMessage", () => ({ SendMessage: sendMessage }));
jest.mock("../../models/Company", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/Plan", () => ({ __esModule: true, default: {} }));
const logs: string[] = [];
jest.mock("../../utils/logger", () => ({
  logger: { info: (m: string) => logs.push(`info ${m}`), warn: (m: string) => logs.push(`warn ${m}`), error: jest.fn() }
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const { welcomeText, welcomeHtml, whatsappNumber } = require("../../helpers/WelcomeMessage");
const SendWelcomeService = require("../../services/CompanyService/SendWelcomeService").default;

const base = {
  companyName: "Loja <b>X</b>",
  email: "dono@loja.com",
  planName: "Pro",
  planValue: 99.9,
  users: 5,
  connections: 2,
  queues: 3,
  dueDate: "2026-10-10T12:00:00.000Z",
  loginUrl: "https://app.exemplo.com/login"
};

describe("mensagem de boas-vindas", () => {
  it("traz login, link e plano; a senha só quando foi gerada", () => {
    const text = welcomeText(base);
    expect(text).toContain("dono@loja.com");
    expect(text).toContain("https://app.exemplo.com/login");
    expect(text).toContain("Plano Pro");
    expect(text).toMatch(/R\$\s?99,90/);
    expect(text).toContain("10/10/2026");
    expect(text).not.toMatch(/Senha/);
    expect(welcomeText({ ...base, password: "Gerada#123" })).toContain("Senha provisória: Gerada#123");
    expect(welcomeHtml({ ...base, password: "Gerada#123" })).toContain("Gerada#123");
  });

  it("escapa HTML no e-mail", () => {
    const html = welcomeHtml(base);
    expect(html).toContain("Loja &lt;b&gt;X&lt;/b&gt;");
    expect(html).not.toContain("<b>X</b>");
  });

  it("normaliza o telefone para o WhatsApp", () => {
    expect(whatsappNumber("(11) 99999-8888")).toBe("5511999998888");
    expect(whatsappNumber("1133334444")).toBe("551133334444");
    expect(whatsappNumber("+55 11 99999-8888")).toBe("5511999998888");
    expect(whatsappNumber("123")).toBeNull();
    expect(whatsappNumber("")).toBeNull();
  });
});

describe("SendWelcomeService", () => {
  const company: any = { id: 9, name: "Loja", email: "dono@loja.com", phone: "(11) 99999-8888", dueDate: base.dueDate };
  const plan: any = { name: "Pro", value: 99.9, users: 5, connections: 2, queues: 3 };

  beforeEach(() => {
    jest.clearAllMocks();
    logs.length = 0;
    process.env.FRONTEND_URL = "https://app.exemplo.com/";
    isMailConfigured.mockReturnValue(true);
    sendMail.mockResolvedValue(undefined);
    getDefaultWhatsApp.mockResolvedValue({ id: 1 });
    onWhatsApp.mockResolvedValue([{ exists: true, jid: "551199998888@s.whatsapp.net" }]);
    sendMessage.mockResolvedValue({});
  });

  it("envia e-mail e WhatsApp pela conexão da empresa da plataforma, no número conferido", async () => {
    await SendWelcomeService({ company, plan });
    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: "dono@loja.com" });
    expect(sendMail.mock.calls[0][0].html).toContain("https://app.exemplo.com/login");
    expect(getDefaultWhatsApp).toHaveBeenCalledWith(1);
    expect(onWhatsApp).toHaveBeenCalledWith("5511999998888@s.whatsapp.net");
    expect(sendMessage.mock.calls[0][1].number).toBe("551199998888");
    expect(sendMessage.mock.calls[0][1].body).not.toMatch(/Senha/);
    expect(logs).toEqual(expect.arrayContaining([
      "info Boas-vindas: e-mail enviado para dono@loja.com",
      "info Boas-vindas: WhatsApp enviado para 551199998888 pela conexão 1"
    ]));
  });

  it("sem MAIL_* não envia e-mail; sem telefone não envia WhatsApp", async () => {
    isMailConfigured.mockReturnValue(false);
    await SendWelcomeService({ company: { ...company, phone: "" }, plan });
    expect(sendMail).not.toHaveBeenCalled();
    expect(getDefaultWhatsApp).not.toHaveBeenCalled();
  });

  it("falhas no e-mail, sem conexão ou número sem WhatsApp nunca lançam", async () => {
    sendMail.mockRejectedValue(Object.assign(new Error("Invalid login"), { code: "EAUTH", responseCode: 535 }));
    getDefaultWhatsApp.mockRejectedValue(new Error("sem conexão"));
    await expect(SendWelcomeService({ company, plan, password: "x" })).resolves.toBeUndefined();
    expect(logs).toContain("warn Boas-vindas da empresa 9: falhou (EAUTH 535 Invalid login)");

    getDefaultWhatsApp.mockResolvedValue({ id: 1 });
    onWhatsApp.mockResolvedValue([]);
    await expect(SendWelcomeService({ company, plan })).resolves.toBeUndefined();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("usa PLATFORM_COMPANY_ID quando definido", async () => {
    process.env.PLATFORM_COMPANY_ID = "3";
    await SendWelcomeService({ company, plan });
    expect(getDefaultWhatsApp).toHaveBeenCalledWith(3);
    delete process.env.PLATFORM_COMPANY_ID;
  });
});
