import { Request, Response } from "express";
import { assertRecordInCompany } from "../helpers/CompanyAccess";
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

type FilterList = {
  queueId: string | number;
  queueOptionId: string | number;
  parentId: string | number | boolean;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { queueId, queueOptionId, parentId } = req.query as FilterList;
  if (queueId) await assertRecordInCompany(Queue, queueId, req.user);
  if (queueOptionId) await assertQueueOptionAccess(queueOptionId, req);

  const queueOptions = await ListService({ queueId, queueOptionId, parentId });

  return res.json(queueOptions);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const queueOptionData = req.body;
  await assertRecordInCompany(Queue, queueOptionData.queueId, req.user);

  const queueOption = await CreateService(queueOptionData);

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
  const queueOptionData = req.body;

  await assertQueueOptionAccess(queueOptionId, req);
  if (queueOptionData.queueId) {
    await assertRecordInCompany(Queue, queueOptionData.queueId, req.user);
  }
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

  return res.status(200).json({ message: "Option Delected" });
};
