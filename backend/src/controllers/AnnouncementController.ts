import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { head } from "lodash";
import fs from "fs";

import ListService from "../services/AnnouncementService/ListService";
import CreateService from "../services/AnnouncementService/CreateService";
import ShowService from "../services/AnnouncementService/ShowService";
import UpdateService from "../services/AnnouncementService/UpdateService";
import DeleteService from "../services/AnnouncementService/DeleteService";
import FindService from "../services/AnnouncementService/FindService";

import Announcement from "../models/Announcement";

import AppError from "../errors/AppError";
import { isSuperUser } from "../helpers/CompanyAccess";
import { parseAnnouncement } from "../helpers/AnnouncementInput";
import { publicFilePath } from "../config/upload";

// Informativos são para todos (vêm do super). Inativos saem dos clientes
// como "delete"; antes a exclusão usava outro nome de evento e não chegava.
const broadcast = (record: Announcement) => {
  const io = getIO();
  io.emit("company-announcement", record.status ? { action: "update", record } : { action: "delete", id: record.id });
};

const removeMediaFile = (fileName?: string | null) => {
  if (!fileName) return;
  fs.rmSync(publicFilePath(fileName), { force: true });
};

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
};

type StoreData = {
  priority: string;
  title: string;
  text: string;
  status: string;
  companyId: number;
  mediaPath?: string;
  mediaName?: string;
};

type FindParams = {
  companyId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const includeInactive = req.query.all === "1" && (await isSuperUser(req.user.id));

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    includeInactive
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = parseAnnouncement(req.body, true);

  const record = await CreateService({ ...data, companyId } as never);
  broadcast(record);

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);
  // Inativo só para o super (tela de administração).
  if (!record.status && !(await isSuperUser(req.user.id))) {
    throw new AppError("ERR_NO_ANNOUNCEMENT_FOUND", 404);
  }

  return res.status(200).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const data = parseAnnouncement(req.body, false);

  const record = await UpdateService({ ...data, id } as never);
  broadcast(record);

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const record = await ShowService(id);

  await DeleteService(id);
  removeMediaFile(record.mediaPath);

  const io = getIO();
  io.emit("company-announcement", { action: "delete", id: +id });

  return res.status(200).json({ message: "Announcement deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const params = req.query as FindParams;
  const records: Announcement[] = await FindService(params);

  return res.status(200).json(records);
};

export const mediaUpload = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);
  if (!file) throw new AppError("ERR_NO_FILE", 400);

  const announcement = await Announcement.findByPk(id);
  if (!announcement) {
    fs.rmSync(file.path, { force: true });
    throw new AppError("ERR_NO_ANNOUNCEMENT_FOUND", 404);
  }

  // A imagem anterior sai do disco (antes ficava órfã em public/).
  if (announcement.mediaPath && announcement.mediaPath !== file.filename) removeMediaFile(announcement.mediaPath);
  await announcement.update({ mediaPath: file.filename, mediaName: file.originalname });
  await announcement.reload();
  broadcast(announcement);

  return res.send({ mensagem: "Mensagem enviada" });
};

export const deleteMedia = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const announcement = await Announcement.findByPk(id);
  if (!announcement) throw new AppError("ERR_NO_ANNOUNCEMENT_FOUND", 404);

  // Mesma pasta do upload (antes dependia da pasta de onde o processo subiu).
  removeMediaFile(announcement.mediaPath);
  await announcement.update({ mediaPath: null, mediaName: null });
  await announcement.reload();
  broadcast(announcement);

  return res.send({ mensagem: "Arquivo excluído" });
};
