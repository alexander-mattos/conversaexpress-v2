import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";

type TokenPayload = {
  token: string | undefined;
};

const safeEqual = (received: unknown, expected: string): boolean => {
  if (typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Protege rotas de integração com o ENV_TOKEN. Sem ENV_TOKEN configurado
// a rota fica bloqueada (antes, undefined === undefined liberava o acesso).
const envTokenAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const expected = process.env.ENV_TOKEN;
  const { token: bodyToken } = (req.body || {}) as TokenPayload;
  const { token: queryToken } = req.query as TokenPayload;

  if (expected && (safeEqual(queryToken, expected) || safeEqual(bodyToken, expected))) {
    return next();
  }

  throw new AppError("Token inválido", 403);
};

export default envTokenAuth;
