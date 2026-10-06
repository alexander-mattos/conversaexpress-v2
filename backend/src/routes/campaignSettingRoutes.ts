import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";

import * as CampaignSettingController from "../controllers/CampaignSettingController";
import { campaignsPlan } from "../helpers/CampaignAccess";

const routes = express.Router();

routes.get("/campaign-settings", isAuth, campaignsPlan, CampaignSettingController.index);

routes.post("/campaign-settings", isAuth, isAdmin, campaignsPlan, CampaignSettingController.store);

export default routes;
