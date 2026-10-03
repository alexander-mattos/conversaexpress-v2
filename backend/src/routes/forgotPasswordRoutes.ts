import express from "express";
import * as ForgotController from "../controllers/ForgotController";
import { passwordResetLimiter } from "../middleware/rateLimit";

const forgotsRoutes = express.Router();

forgotsRoutes.post("/forgetpassword", passwordResetLimiter, ForgotController.store);
forgotsRoutes.post("/resetpasswords", passwordResetLimiter, ForgotController.resetPasswords);

export default forgotsRoutes;
