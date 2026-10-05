import { Request, Response } from "express";
import { assertRecordInCompany } from "../helpers/CompanyAccess";
import QueueIntegrations from "../models/QueueIntegrations";
import { getIO } from "../libs/socket";
import { parseExternalUrl } from "../helpers/SafeExternalUrl";
import CreateQueueIntegrationService from "../services/QueueIntegrationServices/CreateQueueIntegrationService";
import DeleteQueueIntegrationService from "../services/QueueIntegrationServices/DeleteQueueIntegrationService";
import ListQueueIntegrationService from "../services/QueueIntegrationServices/ListQueueIntegrationService";
import ShowQueueIntegrationService from "../services/QueueIntegrationServices/ShowQueueIntegrationService";
import UpdateQueueIntegrationService from "../services/QueueIntegrationServices/UpdateQueueIntegrationService";

// Tipos cuja URL é chamada pelo servidor.
const URL_TYPES = ["n8n", "webhook", "typebot"];
const assertIntegrationUrl = (type: string | undefined, urlN8N: string | undefined): void => {
  if (type && URL_TYPES.includes(type) && urlN8N) parseExternalUrl(urlN8N);
};

// Eventos de socket chegam a todos os usuários: sem as credenciais.
const forSocket = (integration: QueueIntegrations) => {
  const { jsonContent, ...data } = integration.toJSON() as Record<string, unknown>;
  return data;
};

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { queueIntegrations, count, hasMore } = await ListQueueIntegrationService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.status(200).json({ queueIntegrations, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { type, name, projectName, jsonContent, language, urlN8N,
    typebotExpires,
    typebotKeywordFinish,
    typebotSlug,
    typebotUnknownMessage,
    typebotKeywordRestart,
    typebotRestartMessage,
    typebotDelayMessage } = req.body;
  const { companyId } = req.user;
  assertIntegrationUrl(type, urlN8N);
  const queueIntegration = await CreateQueueIntegrationService({
    typebotDelayMessage,
    type, name, projectName, jsonContent, language, urlN8N, companyId,
    typebotExpires,
    typebotKeywordFinish,
    typebotSlug,
    typebotUnknownMessage,
    typebotKeywordRestart,
    typebotRestartMessage
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-queueIntegration`, {
    action: "create",
    queueIntegration: forSocket(queueIntegration)
  });

  return res.status(200).json(queueIntegration);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { integrationId } = req.params;
  const { companyId } = req.user;

  const queueIntegration = await ShowQueueIntegrationService(integrationId, companyId);

  return res.status(200).json(queueIntegration);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { integrationId } = req.params;
  const integrationData = req.body;
  const { companyId } = req.user;

  const current = await ShowQueueIntegrationService(integrationId, companyId);
  assertIntegrationUrl(integrationData.type ?? current.type, integrationData.urlN8N);
  const queueIntegration = await UpdateQueueIntegrationService({ integrationData, integrationId, companyId });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-queueIntegration`, {
    action: "update",
    queueIntegration: forSocket(queueIntegration)
  });

  return res.status(201).json(queueIntegration);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { integrationId } = req.params;
  const { companyId } = req.user;

  await assertRecordInCompany(QueueIntegrations, integrationId, req.user);
  await DeleteQueueIntegrationService(integrationId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-queueIntegration`, {
    action: "delete",
    integrationId: +integrationId
  });

  return res.status(200).send();
};