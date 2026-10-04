import { Request, Response } from "express";
import express from "express";
import * as Yup from "yup";
import Gerencianet from "gn-api-sdk-typescript";
import AppError from "../errors/AppError";

import options from "../config/Gn";
import Company from "../models/Company";
import Invoices from "../models/Invoices";
import Subscriptions from "../models/Subscriptions";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";

const app = express();


export const index = async (req: Request, res: Response): Promise<Response> => {
  const gerencianet = Gerencianet(options);
  return res.json(gerencianet.getSubscriptions());
};

export const createSubscription = async (
  req: Request,
  res: Response
  ): Promise<Response> => {
    const gerencianet = Gerencianet(options);
    const { companyId } = req.user;

  const { invoiceId } = req.body;

  // O valor cobrado vem da fatura no banco, nunca do corpo da requisição.
  const invoice = await Invoices.findByPk(invoiceId);
  if (!invoice || invoice.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  if (invoice.status === "paid") {
    throw new AppError("ERR_INVOICE_ALREADY_PAID", 400);
  }

  const body = {
    calendario: {
      expiracao: 3600
    },
    valor: {
      original: Number(invoice.value).toFixed(2)
    },
    chave: process.env.GERENCIANET_PIX_KEY,
    solicitacaoPagador: `#Fatura:${invoice.id}`
  };
  try {
    const pix = await gerencianet.pixCreateImmediateCharge(null, body);

    const qrcode = await gerencianet.pixGenerateQRCode({
      id: pix.loc.id
    });



/*     await Subscriptions.create({
      companyId,
      isActive: false,
      userPriceCents: users,
      whatsPriceCents: connections,
      lastInvoiceUrl: pix.location,
      lastPlanChange: new Date(),
      providerSubscriptionId: pix.loc.id,
      expiresAt: new Date()
    }); */

/*     const { id } = req.user;
    const userData = {};
    const userId = id;
    const requestUserId = parseInt(id);
    const user = await UpdateUserService({ userData, userId, companyId, requestUserId }); */

    /*     const io = getIO();
        io.emit("user", {
          action: "update",
          user
        }); */


    return res.json({
      ...pix,
      qrcode,

    });
  } catch (error) {
    throw new AppError("Validation fails", 400);
  }
};

export const createWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    chave: Yup.string().required(),
    url: Yup.string().required()
  });

  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const { chave, url } = req.body;

  const body = {
    webhookUrl: url
  };

  const params = {
    chave
  };

  try {
    const gerencianet = Gerencianet(options);
    const create = await gerencianet.pixConfigWebhook(params, body);
    return res.json(create);
  } catch (error) {
    throw new AppError("ERR_WEBHOOK_CONFIG", 400);
  }
};

export const webhook = async (
  req: Request,
  res: Response
  ): Promise<Response> => {
  const { type } = req.params;
  const { evento } = req.body;
  if (evento === "teste_webhook") {
    return res.json({ ok: true });
  }
  if (Array.isArray(req.body.pix)) {
    const gerencianet = Gerencianet(options);
    for (const pix of req.body.pix) {
      try {
        // Os dados do corpo não são confiáveis: a cobrança é consultada na Efí.
        const detalhe = await gerencianet.pixDetailCharge({ txid: pix.txid });
        if (detalhe?.status !== "CONCLUIDA") continue;

        const invoiceId = String(detalhe.solicitacaoPagador || "").replace("#Fatura:", "");
        const invoice = await Invoices.findByPk(invoiceId);
        // Idempotência: fatura já paga não estende o vencimento de novo.
        if (!invoice || invoice.status === "paid") continue;

        const paid = Number(detalhe.valor?.original);
        if (!(paid >= Number(invoice.value))) {
          logger.warn(`Pix ${pix.txid}: valor ${paid} menor que a fatura ${invoice.id}`);
          continue;
        }

        const company = await Company.findByPk(invoice.companyId);
        if (!company) continue;

        const expiresAt = new Date(company.dueDate);
        expiresAt.setDate(expiresAt.getDate() + 30);
        const date = expiresAt.toISOString().split("T")[0];

        await invoice.update({ status: "paid" });
        await company.update({ dueDate: date });
        await company.reload();

        const io = getIO();
        io.to(`company-${company.id}-mainchannel`).emit(`company-${company.id}-payment`, {
          action: detalhe.status,
          company
        });
      } catch (err) {
        logger.error(err, "Erro ao processar webhook Pix");
      }
    }
  }

  return res.json({ ok: true });
};
