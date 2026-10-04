import { Request, Response } from "express";
import SendMail from "../services/ForgotPassWordServices/SendMail";
import ResetPassword from "../services/ResetPasswordService/ResetPassword";
import AppError from "../errors/AppError";

type ForgotBody = { email?: string };
type ResetBody = { email?: string; token?: string; password?: string };

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email } = req.body as ForgotBody;
  if (!email || typeof email !== "string") {
    throw new AppError("ERR_INVALID_EMAIL", 400);
  }

  await SendMail(email.trim());

  // Resposta idêntica exista ou não o e-mail.
  return res.status(200).json({
    message: "Se o e-mail estiver cadastrado, você receberá o código."
  });
};

export const resetPasswords = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { email, token, password } = req.body as ResetBody;
  if (
    typeof email !== "string" ||
    typeof token !== "string" ||
    typeof password !== "string"
  ) {
    throw new AppError("ERR_INVALID_RESET_TOKEN", 400);
  }

  await ResetPassword(email.trim(), token.trim(), password);

  return res.status(200).json({ message: "Senha redefinida com sucesso" });
};
