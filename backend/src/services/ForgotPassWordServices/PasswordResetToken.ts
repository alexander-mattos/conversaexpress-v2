import { createHash, randomBytes, timingSafeEqual } from "crypto";

// Validade do token de redefinição de senha enviado por e-mail.
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const generateResetToken = (): string => randomBytes(24).toString("hex");

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

// Valor gravado em Users.resetPassword: "<sha256 do token>:<expira em ms>".
// O token em texto puro só existe no e-mail enviado ao usuário.
export const buildStoredToken = (token: string, now = Date.now()): string =>
  `${hashToken(token)}:${now + RESET_TOKEN_TTL_MS}`;

export const isResetTokenValid = (
  token: string,
  stored: string | null | undefined,
  now = Date.now()
): boolean => {
  if (!token || !stored) return false;

  const [storedHash, expiresAt] = stored.split(":");
  if (!storedHash || !expiresAt || Number(expiresAt) < now) return false;

  const received = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (received.length !== expected.length) return false;

  return timingSafeEqual(received, expected);
};
