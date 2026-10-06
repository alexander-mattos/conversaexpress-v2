import * as Sentry from "@sentry/node";
import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { MessageData, SendMessage } from "./helpers/SendMessage";
import Whatsapp from "./models/Whatsapp";
import { logger } from "./utils/logger";
import moment from "moment";
import Schedule from "./models/Schedule";
import Contact from "./models/Contact";
import { Op, QueryTypes, Sequelize } from "sequelize";
import GetDefaultWhatsApp from "./helpers/GetDefaultWhatsApp";
import Campaign from "./models/Campaign";
import ContactList from "./models/ContactList";
import ContactListItem from "./models/ContactListItem";
import { isEmpty, isNil, isArray } from "lodash";
import CampaignSetting from "./models/CampaignSetting";
import { campaignMediaPath } from "./config/upload";
import CampaignShipping from "./models/CampaignShipping";
import GetWhatsappWbot from "./helpers/GetWhatsappWbot";
import sequelize from "./database";
import { getMessageOptions } from "./services/WbotServices/SendWhatsAppMedia";
import { getIO } from "./libs/socket";
import path from "path";
import User from "./models/User";
import Company from "./models/Company";
import Plan from "./models/Plan";
import Ticket from "./models/Ticket";
import ShowFileService from "./services/FileServices/ShowService";
import FilesOptions from './models/FilesOptions';
import { addSeconds, differenceInSeconds } from "date-fns";
import formatBody from "./helpers/Mustache";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotClosedTickets";
import { TransferTicketQueue } from "./wbotTransferTicketQueue";


const nodemailer = require('nodemailer');

// BullMQ exige maxRetriesPerRequest: null nas conexões dos workers.
const connection = new IORedis(process.env.REDIS_URI || "", {
  maxRetriesPerRequest: null
});
// Prefixo próprio: o Bull 4 e o BullMQ usam formatos incompatíveis sob "bull:".
const prefix = "bullmq";
const limiterMax = process.env.REDIS_OPT_LIMITER_MAX || 1;
const limiterDuration = process.env.REDIS_OPT_LIMITER_DURATION || 3000;

interface ProcessCampaignData {
  id: number;
  delay: number;
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  delay: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

// Jobs concluídos/falhos são removidos por idade (substitui a limpeza manual).
const defaultJobOptions = {
  removeOnComplete: { age: 12 * 3600 },
  removeOnFail: { age: 24 * 3600 }
};
const queueOptions = { connection, prefix, defaultJobOptions };

export const messageQueue = new Queue("MessageQueue", queueOptions);
export const sendScheduledMessages = new Queue(
  "SendSacheduledMessages",
  queueOptions
);
export const campaignQueue = new Queue("CampaignQueue", queueOptions);
// Tarefas periódicas: agendadores guardados no Redis rodam uma única vez,
// mesmo com vários processos (antes, crons em memória rodavam em cada um).
export const maintenanceQueue = new Queue("Maintenance", queueOptions);

async function handleSendMessage(job) {
  try {
    const { data } = job;

    const whatsapp = await Whatsapp.findByPk(data.whatsappId);

    if (whatsapp == null) {
      throw Error("Whatsapp não identificado");
    }

    const messageData: MessageData = data.data;

    await SendMessage(whatsapp, messageData);
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessage: error", e.message);
    throw e;
  }
}

{/*async function handleVerifyQueue(job) {
  logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true,
        dueDate: {
          [Op.gt]: Sequelize.literal('CURRENT_DATE')
        }
      },
      include: [
        {
          model: Whatsapp, attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"], where: {
            timeSendQueue: {
              [Op.gt]: 0
            }
          }
        },
      ]
    }); */}

{/*    companies.map(async c => {
      c.whatsapps.map(async w => {

        if (w.status === "CONNECTED") {

          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {

            if (!isNaN(idQueue) && Number.isInteger(idQueue) && !isNaN(timeQueue) && Number.isInteger(timeQueue)) {

              const tempoPassado = moment().subtract(timeQueue, "minutes").utc().format();
              // const tempoAgora = moment().utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  }
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl"],
                    include: ["extraInfo"]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.to(ticket.status)
                    .to("notification")
                    .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  // io.to("pending").emit(`company-${companyId}-ticket`, {
                  //   action: "update",
                  //   ticket,
                  // });

                  logger.info(`Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`);
                });
              } else {
                logger.info(`Nenhum atendimento perdido encontrado - Empresa: ${companyId}`);
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
}; */}

async function closeTicketsAutomatic() {
  const companies = await Company.findAll();
  for (const c of companies) {
    try {
      await ClosedAllOpenTickets(c.id);
    } catch (e: any) {
      Sentry.captureException(e);
      logger.error("ClosedAllOpenTickets -> Verify: error", e.message);
    }
  }
}

async function handleVerifySchedules(job) {
  try {
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        status: "PENDENTE",
        sentAt: null,
        sendAt: {
          [Op.gte]: moment().format("YYYY-MM-DD HH:mm:ss"),
          [Op.lte]: moment().add("30", "seconds").format("YYYY-MM-DD HH:mm:ss")
        }
      },
      include: [{ model: Contact, as: "contact" }]
    });
    if (count > 0) {
      schedules.map(async schedule => {
        await schedule.update({
          status: "AGENDADA"
        });
        sendScheduledMessages.add(
          "SendMessage",
          { schedule },
          { delay: 40000 }
        );
        logger.info(`Disparo agendado para: ${schedule.contact.name}`);
      });
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendScheduledMessage -> Verify: error", e.message);
    throw e;
  }
}

async function handleSendScheduledMessage(job) {
  const {
    data: { schedule }
  } = job;
  let scheduleRecord: Schedule | null = null;

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
  } catch (e) {
    Sentry.captureException(e);
    logger.info(`Erro ao tentar consultar agendamento: ${schedule.id}`);
  }

  try {
    const whatsapp = await GetDefaultWhatsApp(schedule.companyId);

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve("public", schedule.mediaPath);
    }

    await SendMessage(whatsapp, {
      number: schedule.contact.number,
      body: formatBody(schedule.body, schedule.contact),
      mediaPath: filePath
    });

    await scheduleRecord?.update({
      sentAt: moment().format("YYYY-MM-DD HH:mm"),
      status: "ENVIADA"
    });

    logger.info(`Mensagem agendada enviada para: ${schedule.contact.name}`);
  } catch (e: any) {
    Sentry.captureException(e);
    await scheduleRecord?.update({
      status: "ERRO"
    });
    logger.error("SendScheduledMessage -> SendMessage: error", e.message);
    throw e;
  }
}

async function handleVerifyCampaigns(job) {
  /**
   * @todo
   * Implementar filtro de campanhas
   */

  logger.info("[🏁] - Verificando campanhas...");

  const campaigns: { id: number; scheduledAt: string }[] =
    await sequelize.query(
      `select id, "scheduledAt" from "Campaigns" c
    where "scheduledAt" between now() and now() + '1 hour'::interval and status = 'PROGRAMADA'`,
      { type: QueryTypes.SELECT }
    );

  if (campaigns.length > 0)
    logger.info(`[🚩] - Campanhas encontradas: ${campaigns.length}`);

  for (let campaign of campaigns) {
    try {
      const now = moment();
      const scheduledAt = moment(campaign.scheduledAt);
      const delay = scheduledAt.diff(now, "milliseconds");
      logger.info(
        `[📌] - Campanha enviada para a fila de processamento: Campanha=${campaign.id}, Delay Inicial=${delay}`
      );
      campaignQueue.add(
        "ProcessCampaign",
        {
          id: campaign.id,
          delay
        },
        {
          removeOnComplete: true
        }
      );
    } catch (err: any) {
      Sentry.captureException(err);
    }
  }

  logger.info("[🏁] - Finalizando verificação de campanhas programadas...");
}

async function getCampaign(id) {
  return await Campaign.findByPk(id, {
    include: [
      {
        model: ContactList,
        as: "contactList",
        attributes: ["id", "name"],
        include: [
          {
            model: ContactListItem,
            as: "contacts",
            attributes: ["id", "name", "number", "email", "isWhatsappValid"],
            where: { isWhatsappValid: true }
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name", "companyId"]
      },
      {
        model: CampaignShipping,
        as: "shipping",
        include: [{ model: ContactListItem, as: "contact" }]
      }
    ]
  });
}

async function getContact(id) {
  return await ContactListItem.findByPk(id, {
    attributes: ["id", "name", "number", "email"]
  });
}

async function getSettings(campaign) {
  const settings = await CampaignSetting.findAll({
    where: { companyId: campaign.companyId },
    attributes: ["key", "value"]
  });

  let messageInterval: number = 20;
  let longerIntervalAfter: number = 20;
  let greaterInterval: number = 60;
  let variables: any[] = [];

  // Valor antigo que não é JSON válido fica com o padrão, em vez de
  // derrubar o processamento da campanha.
  const parse = (value: string, fallback: any) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  settings.forEach(setting => {
    if (setting.key === "messageInterval") {
      messageInterval = parse(setting.value, messageInterval);
    }
    if (setting.key === "longerIntervalAfter") {
      longerIntervalAfter = parse(setting.value, longerIntervalAfter);
    }
    if (setting.key === "greaterInterval") {
      greaterInterval = parse(setting.value, greaterInterval);
    }
    if (setting.key === "variables") {
      variables = parse(setting.value, variables);
    }
  });

  return {
    messageInterval,
    longerIntervalAfter,
    greaterInterval,
    variables
  };
}

export function parseToMilliseconds(seconds) {
  return seconds * 1000;
}

async function sleep(seconds) {
  logger.info(
    `Sleep de ${seconds} segundos iniciado: ${moment().format("HH:mm:ss")}`
  );
  return new Promise(resolve => {
    setTimeout(() => {
      logger.info(
        `Sleep de ${seconds} segundos finalizado: ${moment().format(
          "HH:mm:ss"
        )}`
      );
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

function getCampaignValidMessages(campaign) {
  const messages = [];

  if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
    messages.push(campaign.message1);
  }

  if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
    messages.push(campaign.message2);
  }

  if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
    messages.push(campaign.message3);
  }

  if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
    messages.push(campaign.message4);
  }

  if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
    messages.push(campaign.message5);
  }

  return messages;
}

function getProcessedMessage(msg: string, variables: any[], contact: any) {
  let finalMessage = msg;

  if (finalMessage.includes("{nome}")) {
    finalMessage = finalMessage.replace(/{nome}/g, contact.name);
  }

  if (finalMessage.includes("{email}")) {
    finalMessage = finalMessage.replace(/{email}/g, contact.email);
  }

  if (finalMessage.includes("{numero}")) {
    finalMessage = finalMessage.replace(/{numero}/g, contact.number);
  }

  variables.forEach(variable => {
    if (finalMessage.includes(`{${variable.key}}`)) {
      const regex = new RegExp(`{${variable.key}}`, "g");
      finalMessage = finalMessage.replace(regex, variable.value);
    }
  });

  return finalMessage;
}

export function randomValue(min, max) {
  return Math.floor(Math.random() * max) + min;
}

async function verifyAndFinalizeCampaign(campaign) {

  logger.info("[🚨] - Verificando se o envio de campanhas finalizou");
  const { contacts } = campaign.contactList;

  const count1 = contacts.length;
  const count2 = await CampaignShipping.count({
    where: {
      campaignId: campaign.id,
      deliveredAt: {
        [Op.not]: null
      }
    }
  });

  if (count1 === count2) {
    await campaign.update({ status: "FINALIZADA", completedAt: moment() });
  }

  const io = getIO();
  io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
    action: "update",
    record: campaign
  });

  logger.info("[🚨] - Fim da verificação de finalização de campanhas");
}

function calculateDelay(index, baseDelay, longerIntervalAfter, greaterInterval, messageInterval) {
  const diffSeconds = differenceInSeconds(baseDelay, new Date());
  if (index > longerIntervalAfter) {
    return diffSeconds * 1000 + greaterInterval
  } else {
    return diffSeconds * 1000 + messageInterval
  }
}

async function handleProcessCampaign(job) {
  logger.info("[🏁] - Iniciou o processamento da campanha de ID: " + job.data.id);
  try {
    const { id }: ProcessCampaignData = job.data;
    const campaign = await getCampaign(id);
    const settings = await getSettings(campaign);
    if (campaign) {

      logger.info("[🚩] - Localizando e configurando a campanha");

      const { contacts } = campaign.contactList;
      if (isArray(contacts)) {

        logger.info("[📌] - Quantidade de contatos a serem enviados: " + contacts.length);

        const contactData = contacts.map(contact => ({
          contactId: contact.id,
          campaignId: campaign.id,
          variables: settings.variables,
        }));

        // const baseDelay = job.data.delay || 0;
        const longerIntervalAfter = parseToMilliseconds(settings.longerIntervalAfter);
        const greaterInterval = parseToMilliseconds(settings.greaterInterval);
        const messageInterval = settings.messageInterval;

        let baseDelay = campaign.scheduledAt;

        const queuePromises = [];
        for (let i = 0; i < contactData.length; i++) {          

          baseDelay = addSeconds(baseDelay, i > longerIntervalAfter ? greaterInterval : messageInterval);

          const { contactId, campaignId, variables } = contactData[i];
          const delay = calculateDelay(i, baseDelay, longerIntervalAfter, greaterInterval, messageInterval);
          const queuePromise = campaignQueue.add(
            "PrepareContact",
            { contactId, campaignId, variables, delay },
            { removeOnComplete: true }
          );
          queuePromises.push(queuePromise);
          logger.info("[🚀] - Cliente de ID: " + contactData[i].contactId + " da campanha de ID: " + contactData[i].campaignId + " com delay: " + delay);
        }
        await Promise.all(queuePromises);
        await campaign.update({ status: "EM_ANDAMENTO" });
      }
    }
  } catch (err: any) {
    Sentry.captureException(err);
  }
}

async function handlePrepareContact(job) {
 
  try {
    const { contactId, campaignId, delay, variables }: PrepareContactData =
      job.data;
    const campaign = await getCampaign(campaignId);
    const contact = await getContact(contactId);

    const campaignShipping: any = {};
    campaignShipping.number = contact.number;
    campaignShipping.contactId = contactId;
    campaignShipping.campaignId = campaignId;

    logger.info("[🏁] - Iniciou a preparação do contato | contatoId: " + contactId + " CampanhaID: " + campaignId);

    const messages = getCampaignValidMessages(campaign);
    if (messages.length) {
      const radomIndex = randomValue(0, messages.length);
      const message = getProcessedMessage(
        messages[radomIndex],
        variables,
        contact
      );
      campaignShipping.message = `\u200c ${message}`;
    }

    const [record, created] = await CampaignShipping.findOrCreate({
      where: {
        campaignId: campaignShipping.campaignId,
        contactId: campaignShipping.contactId
      },
      defaults: campaignShipping
    });

    logger.info("[🚩] - Registro de envio de camapanha para contato criado | contatoId: " + contactId + " CampanhaID: " + campaignId);

    if (
      !created &&
      record.deliveredAt === null
    ) {
      record.set(campaignShipping);
      await record.save();
    }

    if (
      record.deliveredAt === null 
    ) {
      const nextJob = await campaignQueue.add(
        "DispatchCampaign",
        {
          campaignId: campaign.id,
          campaignShippingId: record.id,
          contactListItemId: contactId
        },
        {
          delay
        }
      );

      await record.update({ jobId: nextJob.id });
    }

    await verifyAndFinalizeCampaign(campaign);
    logger.info("[🏁] - Finalizado a preparação do contato | contatoId: " + contactId + " CampanhaID: " + campaignId);
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`campaignQueue -> PrepareContact -> error: ${err.message}`);
  }
}

async function handleDispatchCampaign(job) {
  try {
    const { data } = job;
    const { campaignShippingId, campaignId }: DispatchCampaignData = data;
    const campaign = await getCampaign(campaignId);
    const wbot = await GetWhatsappWbot(campaign.whatsapp);

    logger.info("[🏁] - Disparando campanha | CampaignShippingId: " + campaignShippingId + " CampanhaID: " + campaignId);

    if (!wbot) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: wbot not found`);
      return;
    }

    if (!campaign.whatsapp) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: whatsapp not found`);
      return;
    }

    // A conexão precisa ser da empresa da campanha.
    if (Number(campaign.whatsapp.companyId) !== Number(campaign.companyId)) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: whatsapp of another company`);
      return;
    }

    if (!wbot?.user?.id) {
      logger.error(`campaignQueue -> DispatchCampaign -> error: wbot user not found`);
      return;
    }

    logger.info("[🚩] - Disparando campanha | CampaignShippingId: " + campaignShippingId + " CampanhaID: " + campaignId);

    const campaignShipping = await CampaignShipping.findByPk(
      campaignShippingId,
      {
        include: [{ model: ContactListItem, as: "contact" }]
      }
    );

    const chatId = `${campaignShipping.number}@s.whatsapp.net`;

    let body = campaignShipping.message;

    if (!isNil(campaign.fileListId)) {

      logger.info("[🚩] - Recuperando a lista de arquivos | CampaignShippingId: " + campaignShippingId + " CampanhaID: " + campaignId);

      try {
        const publicFolder = path.resolve(__dirname, "..", "public");
        const files = await ShowFileService(campaign.fileListId, campaign.companyId)
        const folder = path.resolve(publicFolder, "fileList", String(files.id))
        for (const [index, file] of files.options.entries()) {
          // Opção ainda sem arquivo (o upload não chegou): só o texto não é enviado.
          if (!file.path) continue;
          // basename: o arquivo nunca sai da pasta da lista, mesmo com path antigo forjado.
          const options = await getMessageOptions(file.path, path.resolve(folder, path.basename(String(file.path || ""))), file.name);
          await wbot.sendMessage(chatId, { ...options });

          logger.info("[🚩] - Enviou arquivo: "+ file.name +" | CampaignShippingId: " + campaignShippingId + " CampanhaID: " + campaignId);
        };
      } catch (error) {
        logger.info(error);
      }
    }

    if (campaign.mediaPath) {

      logger.info("[🚩] - Preparando midia da campanha: "+ campaign.mediaPath +" | CampaignShippingId: " + campaignShippingId + " CampanhaID: " + campaignId);

      // basename dentro da pasta da campanha: um mediaPath forjado não lê
      // outros arquivos do servidor.
      const filePath = campaignMediaPath(campaign.id, campaign.mediaPath);

      const options = await getMessageOptions(campaign.mediaName, filePath, body);
      if (Object.keys(options).length) {
        await wbot.sendMessage(chatId, { ...options });
      }
    }
    else {

      logger.info("[🚩] - Enviando mensagem de texto da campanha | CampaignShippingId: " + campaignShippingId + " CampanhaID: " + campaignId);

      await wbot.sendMessage(chatId, {
        text: body
      });
    }

    logger.info("[🚩] - Atualizando campanha para enviada... | CampaignShippingId: " + campaignShippingId + " CampanhaID: " + campaignId);

    await campaignShipping.update({ deliveredAt: moment() });

    await verifyAndFinalizeCampaign(campaign);

    const io = getIO();
    io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
      action: "update",
      record: campaign
    });

    logger.info(
      `[🏁] - Campanha enviada para: Campanha=${campaignId};Contato=${campaignShipping.contact.name}`
    );

  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(err.message);
    console.log(err.stack);
  }
}

async function handleLoginStatus(job) {
  const users: { id: number }[] = await sequelize.query(
    `select id from "Users" where "updatedAt" < now() - '5 minutes'::interval and online = true`,
    { type: QueryTypes.SELECT }
  );
  for (let item of users) {
    try {
      const user = await User.findByPk(item.id);
      await user.update({ online: false });
      logger.info(`Usuário passado para offline: ${item.id}`);
    } catch (e: any) {
      Sentry.captureException(e);
    }
  }
}


async function createInvoices() {
  const companies = await Company.findAll();
  for (const c of companies) {
    try {
      var dueDate = c.dueDate;
      const date = moment(dueDate).format();
      const timestamp = moment().format();
      const hoje = moment(moment()).format("DD/MM/yyyy");
      var vencimento = moment(dueDate).format("DD/MM/yyyy");

      var diff = moment(vencimento, "DD/MM/yyyy").diff(moment(hoje, "DD/MM/yyyy"));
      var dias = moment.duration(diff).asDays();

      if (dias < 20) {
        const plan = await Plan.findByPk(c.planId);

        const sql = `SELECT COUNT(*) mycount FROM "Invoices" WHERE "companyId" = :companyId AND "dueDate"::text LIKE :dueDatePrefix;`
        const invoice = await sequelize.query(sql, {
          type: QueryTypes.SELECT,
          replacements: {
            companyId: c.id,
            dueDatePrefix: `${moment(dueDate).format("yyyy-MM-DD")}%`
          }
        });
        if (invoice[0]['mycount'] > 0) {

        } else {
          const sql = `INSERT INTO "Invoices" (detail, status, value, "updatedAt", "createdAt", "dueDate", "companyId")
          VALUES (:detail, 'open', :value, :timestamp, :timestamp, :dueDate, :companyId);`

          const invoiceInsert = await sequelize.query(sql, {
            type: QueryTypes.INSERT,
            replacements: {
              detail: plan.name,
              value: plan.value,
              timestamp,
              dueDate: date,
              companyId: c.id
            }
          });

          /*           let transporter = nodemailer.createTransport({
                      service: 'gmail',
                      auth: {
                        user: 'email@gmail.com',
                        pass: 'senha'
                      }
                    });
 
                    const mailOptions = {
                      from: 'heenriquega@gmail.com', // sender address
                      to: `${c.email}`, // receiver (use array of string for a list)
                      subject: 'Fatura gerada - Sistema', // Subject line
                      html: `Olá ${c.name} esté é um email sobre sua fatura!<br>
          <br>
          Vencimento: ${vencimento}<br>
          Valor: ${plan.value}<br>
          Link: ${process.env.FRONTEND_URL}/financeiro<br>
          <br>
          Qualquer duvida estamos a disposição!
                      `// plain text body
                    };
 
                    transporter.sendMail(mailOptions, (err, info) => {
                      if (err)
                        console.log(err)
                      else
                        console.log(info);
                    }); */

        }





      }
    } catch (e: any) {
      Sentry.captureException(e);
      logger.error(`Geração de fatura da empresa ${c.id}: ${e.message}`);
    }
  }
}

type Processors = Record<string, (job: Job) => Promise<unknown>>;

const workers: Worker[] = [];

const startWorker = (
  queue: Queue,
  processors: Processors,
  options: { concurrency?: number; limiter?: { max: number; duration: number } } = {}
): void => {
  const worker = new Worker(
    queue.name,
    async job => {
      const processor = processors[job.name];
      if (!processor) {
        logger.warn(`[fila ${queue.name}] job sem processador: ${job.name}`);
        return undefined;
      }
      return processor(job);
    },
    { connection, prefix, ...options }
  );
  worker.on("failed", (job, err) => {
    logger.error(`[fila ${queue.name}] ${job?.name} falhou: ${err.message}`);
  });
  workers.push(worker);
};

// Agendadores (idempotentes): o mesmo id apenas atualiza o padrão existente.
export const JOB_SCHEDULERS = [
  { id: "verify-schedules", pattern: "*/5 * * * * *", name: "VerifySchedules" },
  { id: "verify-campaigns", pattern: "*/20 * * * * *", name: "VerifyCampaigns" },
  { id: "verify-login-status", pattern: "* * * * *", name: "VerifyLoginStatus" },
  { id: "close-tickets", pattern: "* * * * *", name: "CloseTicketsAutomatic" },
  { id: "transfer-tickets", pattern: "* * * * *", name: "TransferTickets" },
  // Antes rodava a cada 5 s; a fatura é gerada até 20 dias antes do vencimento.
  { id: "create-invoices", pattern: "*/5 * * * *", name: "CreateInvoices" }
];

export async function startQueueProcess(): Promise<void> {
  logger.info("[🏁] - Iniciando processamento de filas");

  startWorker(
    messageQueue,
    { SendMessage: handleSendMessage },
    {
      limiter: {
        max: Number(limiterMax),
        duration: Number(limiterDuration)
      }
    }
  );

  startWorker(sendScheduledMessages, {
    SendMessage: handleSendScheduledMessage
  });

  // Concorrência 1: os disparos seguem um por vez, como antes.
  startWorker(
    campaignQueue,
    {
      VerifyCampaigns: handleVerifyCampaigns,
      ProcessCampaign: handleProcessCampaign,
      PrepareContact: handlePrepareContact,
      DispatchCampaign: handleDispatchCampaign
    },
    { concurrency: 1 }
  );

  startWorker(maintenanceQueue, {
    VerifySchedules: handleVerifySchedules,
    VerifyCampaigns: async () => {
      await campaignQueue.add("VerifyCampaigns", {}, { removeOnComplete: true });
    },
    VerifyLoginStatus: handleLoginStatus,
    CloseTicketsAutomatic: closeTicketsAutomatic,
    TransferTickets: TransferTicketQueue,
    CreateInvoices: createInvoices
  });

  for (const scheduler of JOB_SCHEDULERS) {
    await maintenanceQueue.upsertJobScheduler(
      scheduler.id,
      { pattern: scheduler.pattern },
      { name: scheduler.name, data: {} }
    );
  }
}

export async function closeQueues(): Promise<void> {
  await Promise.all(workers.map(worker => worker.close()));
  await Promise.all(
    [messageQueue, sendScheduledMessages, campaignQueue, maintenanceQueue].map(
      queue => queue.close()
    )
  );
  await connection.quit();
}
