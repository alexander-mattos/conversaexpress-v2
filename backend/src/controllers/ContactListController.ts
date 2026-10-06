import * as Yup from "yup";
import { assertRecordInCompany, resolveCompanyId } from "../helpers/CompanyAccess";
import fs from "fs";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListService from "../services/ContactListService/ListService";
import CreateService from "../services/ContactListService/CreateService";
import ShowService from "../services/ContactListService/ShowService";
import UpdateService from "../services/ContactListService/UpdateService";
import DeleteService from "../services/ContactListService/DeleteService";
import FindService from "../services/ContactListService/FindService";
import { head } from "lodash";

import ContactList from "../models/ContactList";

import AppError from "../errors/AppError";
import { ImportContacts } from "../services/ContactListService/ImportContacts";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
};

type StoreData = {
  name: string;
  companyId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await CreateService({
    ...data,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactList`, {
    action: "create",
    record
  });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  await assertRecordInCompany(ContactList, id, req.user);

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body as StoreData;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;
  await assertRecordInCompany(ContactList, id, req.user);

  const record = await UpdateService({
    ...data,
    id
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactList`, {
    action: "update",
    record
  });

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  await assertRecordInCompany(ContactList, id, req.user);
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactList`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Contact list deleted" });
};

// companyId da query só vale para o super (antes listava as listas de
// qualquer empresa).
export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = await resolveCompanyId(req.query.companyId as string, req.user);
  const records: ContactList[] = await FindService({ companyId: String(companyId) });

  return res.status(200).json(records);
};

export const upload = async (req: Request, res: Response) => {
  const file = head(req.files as Express.Multer.File[]);
  const { id } = req.params;
  const { companyId } = req.user;
  if (!file) throw new AppError("ERR_NO_FILE", 400);

  let response;
  try {
    await assertRecordInCompany(ContactList, id, req.user);
    response = await ImportContacts(+id, companyId, file);
  } finally {
    // A planilha não fica no servidor depois de importada.
    fs.rmSync(file.path, { force: true });
  }

  const io = getIO();

  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactListItem-${+id}`, {
    action: "reload",
    records: response
  });

  return res.status(200).json(response);
};
