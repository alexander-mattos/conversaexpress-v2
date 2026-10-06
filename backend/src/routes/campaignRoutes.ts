import express, { NextFunction, Request, Response } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as CampaignController from "../controllers/CampaignController";
import multer from "multer";
import { campaignUploadConfig } from "../config/upload";
import { campaignsPlan } from "../helpers/CampaignAccess";
import { assertExistsInCompany } from "../helpers/CompanyAccess";
import Campaign from "../models/Campaign";

const upload = multer(campaignUploadConfig);

// Confere a campanha (empresa) ANTES do multer gravar o arquivo.
const campaignInCompany = async (req: Request, res: Response, next: NextFunction) => {
  await assertExistsInCompany(Campaign, req.params.id, req.user);
  next();
};

const routes = express.Router();

// Leitura para todos os perfis; alterar e disparar só para admin. Tudo exige
// campanhas liberadas no plano (ou campaignsEnabled).
routes.get("/campaigns/list", isAuth, campaignsPlan, CampaignController.findList);

routes.get("/campaigns", isAuth, campaignsPlan, CampaignController.index);

routes.get("/campaigns/:id", isAuth, campaignsPlan, CampaignController.show);

routes.post("/campaigns", isAuth, isAdmin, campaignsPlan, CampaignController.store);

routes.put("/campaigns/:id", isAuth, isAdmin, campaignsPlan, CampaignController.update);

routes.delete("/campaigns/:id", isAuth, isAdmin, campaignsPlan, CampaignController.remove);

routes.post("/campaigns/:id/cancel", isAuth, isAdmin, campaignsPlan, CampaignController.cancel);

routes.post("/campaigns/:id/restart", isAuth, isAdmin, campaignsPlan, CampaignController.restart);

routes.post(
  "/campaigns/:id/media-upload",
  isAuth,
  isAdmin,
  campaignsPlan,
  campaignInCompany,
  upload.array("file"),
  CampaignController.mediaUpload
);

routes.delete(
  "/campaigns/:id/media-upload",
  isAuth,
  isAdmin,
  campaignsPlan,
  CampaignController.deleteMedia
);

export default routes;
