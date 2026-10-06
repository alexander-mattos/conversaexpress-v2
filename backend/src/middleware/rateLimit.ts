import { rateLimit } from "express-rate-limit";

const limitHandler = (windowMs: number, limit: number, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "ERR_TOO_MANY_REQUESTS" }
  });

// Tentativas de login com falha por IP (logins bem-sucedidos não contam, para
// não bloquear equipes inteiras atrás do mesmo IP).
export const loginLimiter = limitHandler(15 * 60 * 1000, 20, true);

// Pedidos de código e redefinição de senha por IP.
export const passwordResetLimiter = limitHandler(15 * 60 * 1000, 5);

// Cadastros públicos de empresa por IP.
export const signupLimiter = limitHandler(60 * 60 * 1000, 5);

// API de mensagens: 60 envios por minuto por token (sem o token, por IP).
export const messagesApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: req => String(req.headers.authorization || req.ip),
  message: { error: "ERR_TOO_MANY_REQUESTS" }
});
