import Company from "../../models/Company";
import Plan from "../../models/Plan";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import { SendMessage } from "../../helpers/SendMessage";
import { isMailConfigured, sendMail } from "../../helpers/Mail";
import { welcomeHtml, welcomeText, whatsappNumber, WelcomeData } from "../../helpers/WelcomeMessage";
import { logger } from "../../utils/logger";

interface Request {
  company: Company;
  plan?: Plan | null;
  // Só quando a senha foi gerada pelo sistema (criação pelo super).
  password?: string;
}

// Conexão de onde saem as mensagens da plataforma (a empresa do super).
const platformCompanyId = (): number => Number(process.env.PLATFORM_COMPANY_ID || 1);

const loginUrl = (): string => `${String(process.env.FRONTEND_URL || "").replace(/\/+$/, "")}/login`;

const sendWhatsApp = async (phone: string | null | undefined, text: string): Promise<void> => {
  const number = whatsappNumber(phone);
  if (!number) {
    logger.info("Boas-vindas: empresa sem telefone válido, WhatsApp não enviado");
    return;
  }
  const whatsapp = await GetDefaultWhatsApp(platformCompanyId());
  if (!whatsapp) {
    logger.warn("Boas-vindas: nenhuma conexão de WhatsApp ativa na empresa da plataforma");
    return;
  }
  // Confere o número no WhatsApp (acerta o 9º dígito dos celulares).
  const [found] = (await getWbot(whatsapp.id).onWhatsApp(`${number}@s.whatsapp.net`)) || [];
  if (!found?.exists) {
    logger.warn(`Boas-vindas: o número ${number} não tem WhatsApp`);
    return;
  }
  await SendMessage(whatsapp, { number: String(found.jid).split("@")[0], body: text });
};

// Boas-vindas por e-mail e WhatsApp. Nunca lança: falhas só vão para o log,
// para não atrapalhar o cadastro.
const SendWelcomeService = async ({ company, plan, password }: Request): Promise<void> => {
  const data: WelcomeData = {
    companyName: company.name,
    email: company.email,
    planName: plan?.name || "-",
    planValue: Number(plan?.value || 0),
    users: Number(plan?.users || 0),
    connections: Number(plan?.connections || 0),
    queues: Number(plan?.queues || 0),
    dueDate: company.dueDate,
    loginUrl: loginUrl(),
    password
  };

  const jobs: Promise<void>[] = [];
  if (company.email && isMailConfigured()) {
    jobs.push(sendMail({ to: company.email, subject: "Bem-vindo(a) ao ConversaExpress", html: welcomeHtml(data) }));
  } else {
    logger.info("Boas-vindas: e-mail não configurado (MAIL_*) ou empresa sem e-mail");
  }
  jobs.push(sendWhatsApp(company.phone, welcomeText(data)));

  const results = await Promise.allSettled(jobs);
  results.forEach(r => {
    if (r.status === "rejected") logger.warn(`Boas-vindas da empresa ${company.id}: ${r.reason?.message || r.reason}`);
  });
};

export default SendWelcomeService;
