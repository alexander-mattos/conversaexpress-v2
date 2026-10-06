import express from "express";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import { campaignsPlan } from "../helpers/CampaignAccess";

import * as ContactListItemController from "../controllers/ContactListItemController";

const routes = express.Router();

routes.get(
  "/contact-list-items/list",
  isAuth,
  campaignsPlan,
  ContactListItemController.findList
);

routes.get("/contact-list-items", isAuth, campaignsPlan, ContactListItemController.index);

routes.get("/contact-list-items/:id", isAuth, campaignsPlan, ContactListItemController.show);

routes.post("/contact-list-items", isAuth, isAdmin, campaignsPlan, ContactListItemController.store);

routes.put("/contact-list-items/:id", isAuth, isAdmin, campaignsPlan, ContactListItemController.update);

routes.delete(
  "/contact-list-items/:id",
  isAuth,
  isAdmin,
  campaignsPlan,
  ContactListItemController.remove
);

export default routes;
