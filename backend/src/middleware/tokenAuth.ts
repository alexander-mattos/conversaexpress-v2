import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";

// API de mensagens: o token da conexão no "Authorization: Bearer <token>".
// Token vazio ou ausente é recusado (antes "Bearer " casava com as conexões
// criadas sem token, que nasciam com token = "").
const tokenAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = String(req.headers.authorization || "");
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === header.trim() || token.toLowerCase() === "null") {
    throw new AppError("Acesso não permitido", 401);
  }

  const whatsapp = await Whatsapp.findOne({ where: { token }, attributes: ["id", "companyId"] });
  if (!whatsapp) {
    throw new AppError("Acesso não permitido", 401);
  }

  req.params = {
    whatsappId: whatsapp.id.toString()
  };
  return next();
};

export default tokenAuth;
