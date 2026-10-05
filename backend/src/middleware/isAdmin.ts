import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";

// Ações que a tela só oferece ao perfil admin (rules.js do frontend).
const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return next();
};

export default isAdmin;
