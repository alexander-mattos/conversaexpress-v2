import { CookieOptions, Response } from "express";

// secure só quando a API é servida por HTTPS, para não quebrar o ambiente local.
export const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: (process.env.BACKEND_URL || "").startsWith("https://"),
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

export const SendRefreshToken = (res: Response, token: string): void => {
  res.cookie("jrt", token, refreshCookieOptions());
};
