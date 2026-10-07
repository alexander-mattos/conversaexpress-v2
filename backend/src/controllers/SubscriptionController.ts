import { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import AppError from "../errors/AppError";

import Company from "../models/Company";
import Invoices from "../models/Invoices";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";
import { isValidCpfCnpj, onlyDigits } from "../helpers/CpfCnpj";
import * as Asaas from "../services/BillingServices/AsaasClient";

// Status do Asaas em que a cobrança ainda pode ser paga ou já foi paga.
const PENDING = ["PENDING", "OVERDUE"];
const PAID = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
const PAID_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];

const today = (): string => new Date().toISOString().split("T")[0];

// O cliente no Asaas é criado uma vez por empresa, com o CPF/CNPJ dela.
const ensureCustomer = async (company: Company, cpfCnpj?: string): Promise<string> => {
  if (!company.document) {
    const document = onlyDigits(cpfCnpj);
    if (!isValidCpfCnpj(document)) {
      throw new AppError("ERR_DOCUMENT_REQUIRED", 400);
    }
    await company.update({ document });
  }
  if (!company.asaasCustomerId) {
    const customer = await Asaas.createCustomer({
      name: company.name,
      cpfCnpj: company.document,
      email: company.email || undefined,
      externalReference: String(company.id)
    });
    await company.update({ asaasCustomerId: customer.id });
  }
  return company.asaasCustomerId;
};

export const createSubscription = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { invoiceId, cpfCnpj } = req.body;

  // O valor cobrado vem da fatura no banco, nunca do corpo da requisição.
  const invoice = await Invoices.findByPk(invoiceId);
  if (!invoice || invoice.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  if (invoice.status === "paid") {
    throw new AppError("ERR_INVOICE_ALREADY_PAID", 400);
  }

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }
  const customer = await ensureCustomer(company, cpfCnpj);

  // Reaproveita a cobrança da fatura enquanto ela puder ser paga.
  let payment: Asaas.AsaasPayment | null = null;
  if (invoice.providerPaymentId) {
    const existing = await Asaas.getPayment(invoice.providerPaymentId);
    if (
      PENDING.includes(existing.status) &&
      existing.customer === customer &&
      Number(existing.value) === Number(invoice.value)
    ) {
      payment = existing;
    }
  }
  if (!payment) {
    const invoiceDue = String(invoice.dueDate || "").slice(0, 10);
    payment = await Asaas.createPayment({
      customer,
      value: Number(Number(invoice.value).toFixed(2)),
      dueDate: invoiceDue && invoiceDue > today() ? invoiceDue : today(),
      description: `Fatura #${invoice.id}${invoice.detail ? ` - ${invoice.detail}` : ""}`,
      externalReference: String(invoice.id)
    });
    await invoice.update({ providerPaymentId: payment.id, invoiceUrl: payment.invoiceUrl });
  }

  const pix = await Asaas.getPixQrCode(payment.id);

  return res.json({
    pix: { payload: pix.payload, encodedImage: pix.encodedImage, expirationDate: pix.expirationDate },
    invoiceUrl: payment.invoiceUrl || invoice.invoiceUrl
  });
};

const validWebhookToken = (received: unknown): boolean => {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN || "";
  if (!expected || typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const webhook = async (req: Request, res: Response): Promise<Response> => {
  if (!validWebhookToken(req.headers["asaas-access-token"])) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const { event, payment: bodyPayment } = req.body || {};
  if (!PAID_EVENTS.includes(event) || !bodyPayment?.id) {
    return res.json({ ok: true });
  }

  try {
    // Os dados do corpo não são confiáveis: a cobrança é consultada no Asaas.
    const payment = await Asaas.getPayment(String(bodyPayment.id));
    if (!PAID.includes(payment.status)) return res.json({ ok: true });

    const invoiceId = Number(payment.externalReference);
    if (!Number.isInteger(invoiceId)) return res.json({ ok: true });

    const company = await Invoices.sequelize!.transaction(async transaction => {
      // Lock da fatura: CONFIRMED e RECEIVED chegando juntos pagam uma vez só.
      const invoice = await Invoices.findByPk(invoiceId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!invoice || invoice.status === "paid") return null;

      const company = await Company.findByPk(invoice.companyId, { transaction });
      if (!company || !company.asaasCustomerId || company.asaasCustomerId !== payment.customer) {
        logger.warn(`Asaas ${payment.id}: cliente não confere com a fatura ${invoiceId}`);
        return null;
      }
      if (!(Number(payment.value) >= Number(invoice.value))) {
        logger.warn(`Asaas ${payment.id}: valor ${payment.value} menor que a fatura ${invoiceId}`);
        return null;
      }

      const expiresAt = new Date(company.dueDate);
      expiresAt.setDate(expiresAt.getDate() + 30);
      const dueDate = expiresAt.toISOString().split("T")[0];

      await invoice.update({ status: "paid" }, { transaction });
      await company.update({ dueDate }, { transaction });
      return company;
    });

    if (company) {
      await company.reload();
      const io = getIO();
      io.to(`company-${company.id}-mainchannel`).emit(`company-${company.id}-payment`, {
        action: payment.status,
        company
      });
    }
  } catch (err) {
    logger.error(err, "Erro ao processar webhook do Asaas");
  }

  return res.json({ ok: true });
};
