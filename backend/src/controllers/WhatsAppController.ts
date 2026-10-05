import { Request, Response } from "express";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import { assertExistsInCompany } from "../helpers/CompanyAccess";
import Prompt from "../models/Prompt";
import Queue from "../models/Queue";
import QueueIntegrations from "../models/QueueIntegrations";
import Whatsapp from "../models/Whatsapp";
import withoutSession from "../helpers/WhatsappWithoutSession";
import { getIO } from "../libs/socket";
import { removeWbot } from "../libs/wbot";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";

interface WhatsappData {
  name: string;
  queueIds: number[];
  companyId: number;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  status?: string;
  isDefault?: boolean;
  token?: string;
  //sendIdQueue?: number;
  //timeSendQueue?: number;
  transferQueueId?: number;
  timeToTransfer?: number;  
  promptId?: number;
  maxUseBotQueues?: number;
  timeUseBotQueues?: number;
  expiresTicket?: number;
  expiresInactiveMessage?: string;
}

const ensureAdmin = (req: Request): void => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

// Filas, prompt e integração vinculados à conexão precisam ser da empresa.
const assertWhatsappRefs = async (data: Record<string, any>, req: Request): Promise<void> => {
  if (data.promptId) await assertExistsInCompany(Prompt, data.promptId, req.user);
  if (data.transferQueueId) await assertExistsInCompany(Queue, data.transferQueueId, req.user);
  if (data.integrationId) await assertExistsInCompany(QueueIntegrations, data.integrationId, req.user);
  if (Array.isArray(data.queueIds) && data.queueIds.length > 0) {
    const ids = [...new Set(data.queueIds.map(Number))];
    const count = await Queue.count({ where: { id: { [Op.in]: ids }, companyId: req.user.companyId } });
    if (count !== ids.length) throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

// O token autentica a API de mensagens: não pode repetir entre conexões.
const assertUniqueToken = async (token: unknown, whatsappId?: string | number): Promise<void> => {
  if (!token) return;
  const other = await Whatsapp.findOne({
    where: { token: String(token), ...(whatsappId ? { id: { [Op.ne]: whatsappId } } : {}) },
    attributes: ["id"]
  });
  if (other) throw new AppError("ERR_WAPP_TOKEN_ALREADY_EXISTS", 400);
};

interface QueryParams {
  session?: number | string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  // A coluna session guarda as chaves do Baileys: nunca sai pela API.
  const whatsapps = await ListWhatsAppsService({ companyId, session: 0 });
  const isAdmin = req.user.profile === "admin";

  return res.status(200).json(whatsapps.map(whatsapp => withoutSession(whatsapp, isAdmin)));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  ensureAdmin(req);
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    token,
    //timeSendQueue,
    //sendIdQueue,
	transferQueueId,
	timeToTransfer,
    promptId,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    expiresInactiveMessage
  }: WhatsappData = req.body;
  const { companyId } = req.user;
  await assertWhatsappRefs(req.body, req);

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    companyId,
    token,
    //timeSendQueue,
    //sendIdQueue,
	transferQueueId,
	timeToTransfer,	
    promptId,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    expiresInactiveMessage
  });

  StartWhatsAppSession(whatsapp, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp: withoutSession(whatsapp)
  });

  if (oldDefaultWhatsapp) {
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp: withoutSession(oldDefaultWhatsapp)
    });
  }

  return res.status(200).json(withoutSession(whatsapp, true));
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  // Nunca devolve a coluna session (chaves do Baileys).

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, 0);

  return res.status(200).json(withoutSession(whatsapp, req.user.profile === "admin"));
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  ensureAdmin(req);
  const { whatsappId } = req.params;
  // O cliente não pode sobrescrever as chaves da sessão.
  // Nem o estado da sessão (status, QR): esses vêm só do WhatsApp. Antes,
  // salvar a conexão regravava o status de quando o modal foi aberto.
  const { session: _session, status: _status, qrcode: _qrcode, retries: _retries, companyId: _companyId, ...whatsappData } = req.body;
  const { companyId } = req.user;
  await assertWhatsappRefs(whatsappData, req);
  await assertUniqueToken(whatsappData.token, whatsappId);

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp: withoutSession(whatsapp)
  });

  if (oldDefaultWhatsapp) {
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
      action: "update",
      whatsapp: withoutSession(oldDefaultWhatsapp)
    });
  }

  return res.status(200).json(withoutSession(whatsapp, true));
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  ensureAdmin(req);
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  await ShowWhatsAppService(whatsappId, companyId);

  await DeleteWhatsAppService(whatsappId);
  removeWbot(+whatsappId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};
