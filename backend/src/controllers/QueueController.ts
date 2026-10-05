import { Request, Response } from "express";
import { assertExistsInCompany, resolveCompanyId } from "../helpers/CompanyAccess";
import { parseQueueSchedules } from "../helpers/QueueSchedules";
import Prompt from "../models/Prompt";
import QueueIntegrations from "../models/QueueIntegrations";
import { getIO } from "../libs/socket";
import CreateQueueService from "../services/QueueService/CreateQueueService";
import DeleteQueueService from "../services/QueueService/DeleteQueueService";
import ListQueuesService from "../services/QueueService/ListQueuesService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import UpdateQueueService from "../services/QueueService/UpdateQueueService";

// "" (campo limpo na tela) vira null; ausente continua ausente.
const emptyToNull = (value: unknown) => (value === "" ? null : value);

// Integração e prompt vinculados à fila precisam ser da mesma empresa.
const assertQueueRefs = async (
  integrationId: unknown,
  promptId: unknown,
  req: Request
): Promise<void> => {
  if (integrationId) await assertExistsInCompany(QueueIntegrations, integrationId, req.user);
  if (promptId) await assertExistsInCompany(Prompt, promptId, req.user);
};

type QueueFilter = {
  companyId: number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId: queryCompanyId } = req.query as unknown as QueueFilter;
  // Só o super admin pode listar filas de outra empresa.
  const companyId = await resolveCompanyId(queryCompanyId, req.user);

  const queues = await ListQueuesService({ companyId });

  return res.status(200).json(queues);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, color, greetingMessage, outOfHoursMessage, schedules, orderQueue, integrationId, promptId } =
    req.body;
  const { companyId } = req.user;
  await assertQueueRefs(integrationId, promptId, req);
  const queue = await CreateQueueService({
    name,
    color,
    greetingMessage,
    companyId,
    outOfHoursMessage,
    schedules: parseQueueSchedules(schedules),
    orderQueue: emptyToNull(orderQueue) as number,
    integrationId: emptyToNull(integrationId) as number,
    promptId: emptyToNull(promptId) as number
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-queue`, {
    action: "update",
    queue
  });

  return res.status(200).json(queue);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueId } = req.params;
  const { companyId } = req.user;

  const queue = await ShowQueueService(queueId, companyId);

  return res.status(200).json(queue);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const { companyId } = req.user;
  const { name, color, greetingMessage, outOfHoursMessage, schedules, orderQueue, integrationId, promptId } =
    req.body;
  await assertQueueRefs(integrationId, promptId, req);
  const queue = await UpdateQueueService(queueId, {
    name,
    color,
    greetingMessage,
    outOfHoursMessage,
    schedules: parseQueueSchedules(schedules),
    orderQueue: emptyToNull(orderQueue) as number,
    integrationId: emptyToNull(integrationId) as number,
    promptId: emptyToNull(promptId) as number
  }, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-queue`, {
    action: "update",
    queue
  });

  return res.status(201).json(queue);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const { companyId } = req.user;

  await DeleteQueueService(queueId, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-queue`, {
    action: "delete",
    queueId: +queueId
  });

  return res.status(200).send();
};
