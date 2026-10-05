import { Request, Response } from "express";
import { assertRecordInCompany } from "../helpers/CompanyAccess";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";

import CreateService from "../services/ScheduleServices/CreateService";
import ListService from "../services/ScheduleServices/ListService";
import UpdateService from "../services/ScheduleServices/UpdateService";
import ShowService from "../services/ScheduleServices/ShowService";
import DeleteService from "../services/ScheduleServices/DeleteService";
import Schedule from "../models/Schedule";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import User from "../models/User";
import path from "path";
import fs from "fs";
import { head } from "lodash";

type IndexQuery = {
  searchParam?: string;
  contactId?: number | string;
  userId?: number | string;
  pageNumber?: string | number;
};

// contactId, userId e ticketId vêm do corpo: precisam ser da mesma empresa
// (antes dava para agendar mensagem para contato de outra empresa).
const assertScheduleRefs = async (
  data: { contactId?: unknown; userId?: unknown; ticketId?: unknown },
  requestUser: Request["user"]
): Promise<void> => {
  if (data.contactId) await assertRecordInCompany(Contact, data.contactId, requestUser);
  if (data.userId) await assertRecordInCompany(User, data.userId, requestUser);
  if (data.ticketId) await assertRecordInCompany(Ticket, data.ticketId, requestUser);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, userId, pageNumber, searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { schedules, count, hasMore } = await ListService({
    searchParam,
    contactId,
    userId,
    pageNumber,
    companyId
  });

  return res.json({ schedules, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    body,
    sendAt,
    contactId,
    userId
  } = req.body;
  const { companyId } = req.user;

  await assertScheduleRefs({ contactId, userId }, req.user);

  const schedule = await CreateService({
    body,
    sendAt,
    contactId,
    companyId,
    userId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "create",
    schedule
  });

  return res.status(200).json(schedule);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  const schedule = await ShowService(scheduleId, companyId);

  return res.status(200).json(schedule);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { scheduleId } = req.params;
  const scheduleData = req.body;
  const { companyId } = req.user;

  await assertScheduleRefs(scheduleData, req.user);

  const schedule = await UpdateService({ scheduleData, id: scheduleId, companyId });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "update",
    schedule
  });

  return res.status(200).json(schedule);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  await DeleteService(scheduleId, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "delete",
    scheduleId
  });

  return res.status(200).json({ message: "Schedule deleted" });
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  await assertRecordInCompany(Schedule, id, req.user);
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const schedule = await Schedule.findByPk(id);
    schedule.mediaPath = file.filename;
    schedule.mediaName = file.originalname;

    await schedule.save();
    return res.send({ mensagem: "Arquivo Anexado" });
    } catch (err: any) {
      throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  await assertRecordInCompany(Schedule, id, req.user);

  try {
    const schedule = await Schedule.findByPk(id);
    const filePath = path.resolve("public", path.basename(schedule.mediaPath || ""));
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }
    schedule.mediaPath = null;
    schedule.mediaName = null;
    await schedule.save();
    return res.send({ mensagem: "Arquivo Excluído" });
    } catch (err: any) {
      throw new AppError(err.message);
  }
};