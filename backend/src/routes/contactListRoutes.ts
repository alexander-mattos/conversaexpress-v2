import express, { NextFunction, Request, Response } from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import { spreadsheetUploadConfig } from "../config/upload";
import { campaignsPlan } from "../helpers/CampaignAccess";
import { assertExistsInCompany } from "../helpers/CompanyAccess";
import ContactList from "../models/ContactList";

import * as ContactListController from "../controllers/ContactListController";
import multer from "multer";

const routes = express.Router();

const upload = multer(spreadsheetUploadConfig);

// Confere a lista (empresa) ANTES do multer gravar a planilha.
const listInCompany = async (req: Request, res: Response, next: NextFunction) => {
  await assertExistsInCompany(ContactList, req.params.id, req.user);
  next();
};

routes.get("/contact-lists/list", isAuth, campaignsPlan, ContactListController.findList);

routes.get("/contact-lists", isAuth, campaignsPlan, ContactListController.index);

routes.get("/contact-lists/:id", isAuth, campaignsPlan, ContactListController.show);

routes.post("/contact-lists", isAuth, isAdmin, campaignsPlan, ContactListController.store);

routes.post(
  "/contact-lists/:id/upload",
  isAuth,
  isAdmin,
  campaignsPlan,
  listInCompany,
  upload.array("file"),
  ContactListController.upload
);

routes.put("/contact-lists/:id", isAuth, isAdmin, campaignsPlan, ContactListController.update);

routes.delete("/contact-lists/:id", isAuth, isAdmin, campaignsPlan, ContactListController.remove);

export default routes;
