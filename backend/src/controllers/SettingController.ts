import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import { isSuperUser } from "../helpers/CompanyAccess";
import { parseSettingChange, presentSettings } from "../helpers/SettingsAccess";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import Setting from "../models/Setting";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile } = req.user;

  const settings = await ListSettingsService({ companyId });

  return res.status(200).json(presentSettings((settings ?? []).map(s => s.toJSON()), profile === "admin"));
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { settingKey: key } = req.params;
  const { companyId } = req.user;
  const isSuper = key === "campaignsEnabled" ? await isSuperUser(req.user.id) : false;
  const change = parseSettingChange(key, req.body?.value, isSuper);

  if ("keep" in change) {
    const current = await Setting.findOne({ where: { key, companyId } });
    return res.status(200).json(presentSettings([current ? current.toJSON() : { key, value: "" }], true)[0]);
  }

  const setting = await UpdateSettingService({
    key,
    value: change.value,
    companyId
  });

  const [shown] = presentSettings([setting!.toJSON()], true);
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-settings`, {
    action: "update",
    setting: shown
  });

  return res.status(200).json(shown);
};
