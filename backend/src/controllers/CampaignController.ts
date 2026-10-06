import { assertRecordInCompany, resolveCompanyId } from "../helpers/CompanyAccess";
import { canEditCampaign, parseCampaignInput } from "../helpers/CampaignAccess";
import { campaignMediaPath } from "../config/upload";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { head } from "lodash";
import fs from "fs";

import ListService from "../services/CampaignService/ListService";
import CreateService from "../services/CampaignService/CreateService";
import ShowService from "../services/CampaignService/ShowService";
import UpdateService from "../services/CampaignService/UpdateService";
import DeleteService from "../services/CampaignService/DeleteService";
import FindService from "../services/CampaignService/FindService";

import Campaign from "../models/Campaign";

import AppError from "../errors/AppError";
import { CancelService } from "../services/CampaignService/CancelService";
import { RestartService } from "../services/CampaignService/RestartService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
};

const emitCampaign = (companyId: number, payload: Record<string, unknown>): void => {
  getIO().to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-campaign`, payload);
};

const removeFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // arquivo já removido
  }
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
  const input = await parseCampaignInput(req.body, companyId);
  const record = await CreateService(input, companyId);

  emitCampaign(companyId, { action: "create", record });
  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  await assertRecordInCompany(Campaign, id, req.user);

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  await assertRecordInCompany(Campaign, id, req.user);
  const input = await parseCampaignInput(req.body, companyId);
  const record = await UpdateService(id, input, companyId);

  emitCampaign(companyId, { action: "update", record });
  return res.status(200).json(record);
};

export const cancel = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const record = await CancelService(+req.params.id, companyId);
  emitCampaign(companyId, { action: "update", record });
  return res.status(204).json({ message: "Cancelamento realizado" });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const record = await RestartService(+req.params.id, companyId);
  emitCampaign(companyId, { action: "update", record });
  return res.status(204).json({ message: "Reinício dos disparos" });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  await assertRecordInCompany(Campaign, id, req.user);
  const { companyId } = req.user;

  await DeleteService(id, companyId);

  emitCampaign(companyId, { action: "delete", id: +id });

  return res.status(200).json({ message: "Campaign deleted" });
};

// companyId da query só vale para o super (antes listava campanhas de
// qualquer empresa).
export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyId = await resolveCompanyId(req.query.companyId as string, req.user);
  const records: Campaign[] = await FindService({ companyId: String(companyId) });

  return res.status(200).json(records);
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const file = head(req.files as Express.Multer.File[]);
  if (!file) throw new AppError("ERR_NO_FILE", 400);

  const campaign = await Campaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  if (!canEditCampaign(campaign)) {
    removeFile(file.path);
    throw new AppError("ERR_CAMPAIGN_NOT_EDITABLE", 400);
  }

  // A mídia anterior sai do disco ao trocar.
  if (campaign.mediaPath) removeFile(campaignMediaPath(campaign.id, campaign.mediaPath));
  await campaign.update({ mediaPath: file.filename, mediaName: file.originalname });
  emitCampaign(companyId, { action: "update", record: campaign });
  return res.send({ mensagem: "Mensagem enviada" });
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  await assertRecordInCompany(Campaign, id, req.user);

  const campaign = await Campaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  if (!canEditCampaign(campaign)) throw new AppError("ERR_CAMPAIGN_NOT_EDITABLE", 400);

  if (campaign.mediaPath) removeFile(campaignMediaPath(campaign.id, campaign.mediaPath));
  await campaign.update({ mediaPath: null, mediaName: null });
  emitCampaign(companyId, { action: "update", record: campaign });
  return res.send({ mensagem: "Arquivo excluído" });
};
