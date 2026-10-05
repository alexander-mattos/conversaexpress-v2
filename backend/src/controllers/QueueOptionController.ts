import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { assertExistsInCompany, assertRecordInCompany } from "../helpers/CompanyAccess";
import Queue from "../models/Queue";
import QueueOption from "../models/QueueOption";

import CreateService from "../services/QueueOptionService/CreateService";
import ListService from "../services/QueueOptionService/ListService";
import UpdateService from "../services/QueueOptionService/UpdateService";
import ShowService from "../services/QueueOptionService/ShowService";
import DeleteService from "../services/QueueOptionService/DeleteService";

// A opção pertence à empresa através da fila.
const assertQueueOptionAccess = async (
  queueOptionId: string | number,
  req: Request
): Promise<void> => {
  const option = await QueueOption.findByPk(queueOptionId, {
    attributes: ["id", "queueId"]
  });
  if (option) await assertRecordInCompany(Queue, option.queueId, req.user);
};

// Só estes campos vêm do corpo (antes o corpo inteiro ia para o modelo).
const pickOptionData = (body: Record<string, unknown>) => {
  const data: { title?: string; message?: string; option?: string; queueId?: number; parentId?: number | null } = {};
  if (body.title !== undefined) data.title = String(body.title ?? "");
  if (body.message !== undefined) data.message = body.message === null ? null : String(body.message);
  if (body.option !== undefined) data.option = String(body.option ?? "");
  if (body.queueId !== undefined && body.queueId !== null && body.queueId !== "") data.queueId = Number(body.queueId);
  if (body.parentId !== undefined) data.parentId = body.parentId === null || body.parentId === "" ? null : Number(body.parentId);
  return data;
};

// A opção-pai precisa existir e ser da mesma fila.
const assertParentInQueue = async (parentId: number | null | undefined, queueId: number): Promise<void> => {
  if (!parentId) return;
  const parent = await QueueOption.findByPk(parentId, { attributes: ["id", "queueId"] });
  if (!parent || Number(parent.queueId) !== Number(queueId)) {
    throw new AppError("ERR_QUEUE_OPTION_INVALID_PARENT", 400);
  }
};

type FilterList = {
  queueId: string | number;
  queueOptionId: string | number;
  parentId: string | number | boolean;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { queueId, queueOptionId, parentId } = req.query as FilterList;
  // Sem fila nem opção, a lista trazia as opções de todas as empresas.
  if (!queueId && !queueOptionId) throw new AppError("ERR_QUEUE_OPTION_FILTER_REQUIRED", 400);
  if (queueId) await assertExistsInCompany(Queue, queueId, req.user);
  if (queueOptionId) await assertQueueOptionAccess(queueOptionId, req);

  const queueOptions = await ListService({ queueId, queueOptionId, parentId });

  return res.json(queueOptions);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const queueOptionData = pickOptionData(req.body);
  if (!queueOptionData.queueId) throw new AppError("ERR_QUEUE_OPTION_QUEUE_REQUIRED", 400);
  if (!queueOptionData.title?.trim()) throw new AppError("ERR_QUEUE_OPTION_TITLE_REQUIRED", 400);
  await assertExistsInCompany(Queue, queueOptionData.queueId, req.user);
  await assertParentInQueue(queueOptionData.parentId, queueOptionData.queueId);

  const queueOption = await CreateService({ ...queueOptionData, queueId: queueOptionData.queueId, title: queueOptionData.title, option: queueOptionData.option ?? "" });

  return res.status(200).json(queueOption);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueOptionId } = req.params;

  await assertQueueOptionAccess(queueOptionId, req);
  const queueOption = await ShowService(queueOptionId);

  return res.status(200).json(queueOption);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueOptionId } = req.params
  const queueOptionData = pickOptionData(req.body);

  await assertQueueOptionAccess(queueOptionId, req);
  const current = await QueueOption.findByPk(queueOptionId, { attributes: ["id", "queueId", "parentId"] });
  if (!current) throw new AppError("ERR_NO_QUEUE_OPTION_FOUND", 404);
  if (queueOptionData.title !== undefined && !queueOptionData.title.trim()) {
    throw new AppError("ERR_QUEUE_OPTION_TITLE_REQUIRED", 400);
  }
  if (queueOptionData.queueId) {
    await assertExistsInCompany(Queue, queueOptionData.queueId, req.user);
  }
  const queueId = queueOptionData.queueId ?? current.queueId;
  const parentId = queueOptionData.parentId !== undefined ? queueOptionData.parentId : current.parentId;
  if (Number(parentId) === Number(queueOptionId)) throw new AppError("ERR_QUEUE_OPTION_INVALID_PARENT", 400);
  await assertParentInQueue(parentId, queueId);
  const queueOption = await UpdateService(queueOptionId, queueOptionData);

  return res.status(200).json(queueOption);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueOptionId } = req.params

  await assertQueueOptionAccess(queueOptionId, req);
  await DeleteService(queueOptionId);

  return res.status(200).json({ message: "Option deleted" });
};
