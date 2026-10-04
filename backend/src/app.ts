import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { getAllowedOrigins } from "./helpers/AllowedOrigins";
import helmet from "helmet";
import multer from "multer";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";

import "./database";
import uploadConfig from "./config/upload";
import AppError from "./errors/AppError";
import routes from "./routes";
import { logger } from "./utils/logger";
import { messageQueue, sendScheduledMessages } from "./queues";
import bodyParser from 'body-parser';

Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

app.set("queues", {
  messageQueue,
  sendScheduledMessages
});

// Atrás do nginx: necessário para o rate limit enxergar o IP real do cliente.
app.set("trust proxy", 1);

app.use(
  helmet({
    // A API devolve JSON; /public tem cabeçalhos próprios logo abaixo.
    contentSecurityPolicy: false,
    // O frontend roda em outra origem e carrega mídias de /public.
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use(bodyParser.json({ limit: '10mb' }));

app.use(
  cors({
    credentials: true,
    origin: getAllowedOrigins()
  })
);
app.use(cookieParser());
app.use(Sentry.Handlers.requestHandler());
// Arquivos de /public vêm de usuários e contatos do WhatsApp: nunca devem
// ser executados como página na origem da API.
const ACTIVE_CONTENT = /\.(html?|xhtml|shtml|svgz?|xml|xsl)$/i;
app.use(
  "/public",
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (ACTIVE_CONTENT.test(req.path)) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("Content-Disposition", "attachment");
    }
    next();
  },
  express.static(uploadConfig.directory, { dotfiles: "deny", index: false })
);
app.use(routes);

app.use(Sentry.Handlers.errorHandler());

app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {

  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof multer.MulterError) {
    logger.warn(err);
    return res.status(400).json({ error: `ERR_UPLOAD_${err.code}` });
  }

  logger.error(err);
  return res.status(500).json({ error: "ERR_INTERNAL_SERVER_ERROR" });
});

export default app;
