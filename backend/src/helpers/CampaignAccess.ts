import { NextFunction, Request, Response } from "express";
import { ModelCtor } from "sequelize-typescript";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Plan from "../models/Plan";
import Setting from "../models/Setting";
import Whatsapp from "../models/Whatsapp";
import ContactList from "../models/ContactList";
import Tag from "../models/Tag";
import Files from "../models/Files";

// Campanhas ficam liberadas pelo plano ou pela configuração campaignsEnabled
// da empresa (mesma regra do menu). Antes só a tela conferia.
export const campaignsEnabledFor = async (companyId: number): Promise<boolean> => {
  const company = await Company.findByPk(companyId, {
    attributes: ["id"],
    include: [{ model: Plan, as: "plan", attributes: ["useCampaigns"] }]
  });
  if (company?.plan?.useCampaigns) return true;
  const setting = await Setting.findOne({ where: { companyId, key: "campaignsEnabled" }, attributes: ["value"] });
  return setting?.value === "true" || setting?.value === "enabled";
};

export const campaignsPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!(await campaignsEnabledFor(req.user.companyId))) throw new AppError("ERR_PLAN_FEATURE_DISABLED", 403);
  next();
};

// O registro citado no corpo precisa ser da empresa da campanha (sem exceção
// para o super: uma campanha nunca mistura dados de duas empresas).
export const assertIdInCompany = async (model: ModelCtor, id: number, companyId: number): Promise<void> => {
  const record = await model.findOne({ where: { id, companyId }, attributes: ["id"] });
  if (!record) throw new AppError("ERR_NO_PERMISSION", 403);
};

export const EDITABLE_STATUSES = ["INATIVA", "PROGRAMADA", "CANCELADA"];
const HOUR = 60 * 60 * 1000;

// Mesma regra da tela: programada só até 1h antes do disparo.
export const canEditCampaign = (campaign: { status: string; scheduledAt?: Date | string | null }, now = Date.now()): boolean => {
  if (!EDITABLE_STATUSES.includes(campaign.status)) return false;
  if (campaign.status !== "PROGRAMADA" || !campaign.scheduledAt) return true;
  return new Date(campaign.scheduledAt).getTime() - now > HOUR;
};

export const canCancelCampaign = (status: string): boolean => ["PROGRAMADA", "EM_ANDAMENTO"].includes(status);
export const canRestartCampaign = (status: string): boolean => status === "CANCELADA";

export interface CampaignInput {
  name: string;
  message1: string;
  message2: string;
  message3: string;
  message4: string;
  message5: string;
  scheduledAt: Date | null;
  whatsappId: number | null;
  contactListId: number | null;
  tagId: number | null;
  fileListId: number | null;
}

const MAX_MESSAGE = 4096;

const optionalId = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "" || value === "Nenhuma") return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("ERR_CAMPAIGN_INVALID_FIELD", 400);
  return id;
};

const message = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > MAX_MESSAGE) throw new AppError("ERR_CAMPAIGN_INVALID_FIELD", 400);
  return value;
};

// Só os campos editáveis. status, mediaPath, mediaName, completedAt e
// companyId nunca vêm do corpo (antes iam direto para create/update: dava para
// anexar arquivos do servidor, enviar pela conexão de outra empresa e mudar a
// campanha de empresa).
export const parseCampaignInput = async (body: Record<string, unknown>, companyId: number): Promise<CampaignInput> => {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 3) throw new AppError("ERR_CAMPAIGN_INVALID_NAME", 400);

  let scheduledAt: Date | null = null;
  if (body.scheduledAt !== undefined && body.scheduledAt !== null && body.scheduledAt !== "") {
    scheduledAt = new Date(String(body.scheduledAt));
    if (Number.isNaN(scheduledAt.getTime())) throw new AppError("ERR_CAMPAIGN_INVALID_FIELD", 400);
  }

  const input: CampaignInput = {
    name,
    message1: message(body.message1),
    message2: message(body.message2),
    message3: message(body.message3),
    message4: message(body.message4),
    message5: message(body.message5),
    scheduledAt,
    whatsappId: optionalId(body.whatsappId),
    contactListId: optionalId(body.contactListId),
    tagId: optionalId(body.tagListId ?? body.tagId),
    fileListId: optionalId(body.fileListId)
  };

  if (input.whatsappId) await assertIdInCompany(Whatsapp, input.whatsappId, companyId);
  if (input.contactListId) await assertIdInCompany(ContactList, input.contactListId, companyId);
  if (input.tagId) await assertIdInCompany(Tag, input.tagId, companyId);
  if (input.fileListId) await assertIdInCompany(Files, input.fileListId, companyId);

  return input;
};

// Configurações de envio: só as chaves conhecidas, com tipos e limites, e
// guardadas como JSON válido (a tela faz JSON.parse em cada valor).
export const parseCampaignSettings = (settings: unknown): Record<string, string> => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new AppError("ERR_CAMPAIGN_INVALID_FIELD", 400);
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
    if (["messageInterval", "longerIntervalAfter", "greaterInterval"].includes(key)) {
      const seconds = Number(value);
      if (!Number.isInteger(seconds) || seconds < 0 || seconds > 86400) throw new AppError("ERR_CAMPAIGN_INVALID_FIELD", 400);
      out[key] = JSON.stringify(seconds);
    } else if (key === "variables") {
      if (!Array.isArray(value) || value.length > 100) throw new AppError("ERR_CAMPAIGN_INVALID_FIELD", 400);
      const variables = value.map(item => {
        const k = typeof item?.key === "string" ? item.key.trim() : "";
        const v = typeof item?.value === "string" ? item.value : "";
        if (!/^[\w-]{1,50}$/.test(k) || v.length > 1000) throw new AppError("ERR_CAMPAIGN_INVALID_FIELD", 400);
        return { key: k, value: v };
      });
      out[key] = JSON.stringify(variables);
    } else {
      throw new AppError("ERR_CAMPAIGN_INVALID_FIELD", 400);
    }
  }
  return out;
};
