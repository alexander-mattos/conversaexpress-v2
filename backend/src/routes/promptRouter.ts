import { Router } from "express";
import * as PromptController from "../controllers/PromptController";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";


const promptRoutes = Router();

promptRoutes.get("/prompt", isAuth, isAdmin, PromptController.index);

promptRoutes.post("/prompt", isAuth, isAdmin, PromptController.store);

promptRoutes.get("/prompt/:promptId", isAuth, isAdmin, PromptController.show);

promptRoutes.put("/prompt/:promptId", isAuth, isAdmin, PromptController.update);

promptRoutes.delete("/prompt/:promptId", isAuth, isAdmin, PromptController.remove);

export default promptRoutes;
