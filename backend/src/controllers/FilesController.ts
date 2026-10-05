import { Request, Response } from "express";
import Files from "../models/Files";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";
import fs from "fs";
import { removeFileListFile } from "../helpers/FileListStorage";
import { parseFileOptions } from "../services/FileServices/FileOptionsInput";

import CreateService from "../services/FileServices/CreateService";
import ListService from "../services/FileServices/ListService";
import UpdateService from "../services/FileServices/UpdateService";
import ShowService from "../services/FileServices/ShowService";
import DeleteService from "../services/FileServices/DeleteService";
import SimpleListService from "../services/FileServices/SimpleListService";
import DeleteAllService from "../services/FileServices/DeleteAllService";
import FilesOptions from "../models/FilesOptions";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber, searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { files, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ files, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, message } = req.body;
  const { companyId } = req.user;

  const fileList = await CreateService({
    name,
    message,
    options: parseFileOptions(req.body.options),
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-file`, {
    action: "create",
    fileList
  });

  return res.status(200).json(fileList);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { fileId } = req.params;
  const { companyId } = req.user;

  const file = await ShowService(fileId, companyId);

  return res.status(200).json(file);
};

// A lista já foi conferida antes do multer (rota). Cada arquivo vai para a
// opção indicada pelo id, que precisa ser desta lista.
export const uploadMedias = async (req: Request, res: Response): Promise<Response> => {
  const { fileListId } = req.params;
  const { companyId } = req.user;
  const files = (req.files as Express.Multer.File[]) || [];
  const ids = ([] as unknown[]).concat(req.body.id ?? []);
  const mediaTypes = ([] as unknown[]).concat(req.body.mediaType ?? []);

  const discard = (from: number) => files.slice(from).forEach(file => fs.rmSync(file.path, { force: true }));

  for (const [index, file] of files.entries()) {
    const option = await FilesOptions.findOne({ where: { id: Number(ids[index]), fileId: Number(fileListId) } });
    if (!option) {
      discard(index);
      throw new AppError("ERR_INVALID_FILE_OPTIONS", 400);
    }
    if (option.path && option.path !== file.filename) removeFileListFile(fileListId, option.path);
    await option.update({
      path: file.filename,
      mediaType: String(mediaTypes[index] ?? file.mimetype ?? "")
    });
  }

  const fileList = await ShowService(fileListId, companyId);
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-file`, {
    action: "update",
    fileList
  });

  return res.status(200).json(fileList);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { fileId } = req.params;
  const fileData = { ...req.body, options: parseFileOptions(req.body.options) };
  const { companyId } = req.user;

  const fileList = await UpdateService({ fileData, id: fileId, companyId });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-file`, {
    action: "update",
    fileList
  });

  return res.status(200).json(fileList);
};
    

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { fileId } = req.params;
  const { companyId } = req.user;

  await DeleteService(fileId, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-file`, {
    action: "delete",
    fileId
  });

  return res.status(200).json({ message: "File List deleted" });
};

export const removeAll = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  await DeleteAllService(companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-file`, { action: "reset" });

  return res.send();
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;

  const ratings = await SimpleListService({ searchParam, companyId });

  return res.json(ratings);
};
