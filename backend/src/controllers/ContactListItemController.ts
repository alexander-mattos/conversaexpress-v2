import * as Yup from "yup";
import { assertRecordInCompany, resolveCompanyId } from "../helpers/CompanyAccess";
import { assertIdInCompany } from "../helpers/CampaignAccess";
import ContactList from "../models/ContactList";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListService from "../services/ContactListItemService/ListService";
import CreateService from "../services/ContactListItemService/CreateService";
import ShowService from "../services/ContactListItemService/ShowService";
import UpdateService from "../services/ContactListItemService/UpdateService";
import DeleteService from "../services/ContactListItemService/DeleteService";
import FindService from "../services/ContactListItemService/FindService";

import ContactListItem from "../models/ContactListItem";

import AppError from "../errors/AppError";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
  contactListId: string | number;
};

type StoreData = {
  name: string;
  number: string;
  contactListId: number;
  companyId?: string;
  email?: string;
};


export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, contactListId } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { contacts, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId,
    contactListId
  });

  return res.json({ contacts, count, hasMore });
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

  // A lista precisa ser da empresa, e só nome, número e e-mail vêm do corpo
  // (antes dava para pôr contatos na lista de outra empresa e marcar
  // isWhatsappValid à mão).
  const contactListId = Number(data.contactListId);
  if (!Number.isInteger(contactListId) || contactListId <= 0) throw new AppError("ERR_CONTACTLISTITEM_INVALID_LIST", 400);
  await assertIdInCompany(ContactList, contactListId, companyId);

  const record = await CreateService({
    name: String(data.name),
    number: String(data.number ?? "").replace(/\D/g, ""),
    email: typeof data.email === "string" ? data.email : "",
    contactListId,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactListItem`, {
    action: "create",
    record
  });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  await assertRecordInCompany(ContactListItem, id, req.user);

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
  await assertRecordInCompany(ContactListItem, id, req.user);

  const record = await UpdateService({
    ...data,
    id
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactListItem`, {
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
  await assertRecordInCompany(ContactListItem, id, req.user);
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-ContactListItem`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Contact deleted" });
};

// companyId da query só vale para o super.
export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = await resolveCompanyId(req.query.companyId as string, req.user);
  const contactListId = req.query.contactListId ? Number(req.query.contactListId) : undefined;
  const records: ContactListItem[] = await FindService({ companyId, contactListId });

  return res.status(200).json(records);
};
