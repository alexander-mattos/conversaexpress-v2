"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { isAxiosError } from "axios";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography
} from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { formatBRL, formatDay, type Invoice } from "@/lib/invoices/invoices";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/lib/billing/cpfCnpj";

interface PaymentResponse {
  pix?: { payload?: string; encodedImage?: string; expirationDate?: string };
  invoiceUrl?: string;
}

const errorCode = (err: unknown): string | undefined =>
  isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : undefined;

// Cobrança pelo Asaas: Pix na própria tela e a fatura do Asaas (boleto ou
// cartão) em nova aba. A tela fecha quando o webhook confirma o pagamento.
export default function PaymentDialog({ invoice, onClose, onPaid }: { invoice: Invoice | null; onClose: () => void; onPaid: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [needsDocument, setNeedsDocument] = useState(false);
  const [document, setDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const invoiceId = invoice?.id ?? null;
  const [lastId, setLastId] = useState<number | null>(null);
  if (invoiceId !== lastId) {
    setLastId(invoiceId);
    setPayment(null);
    setNeedsDocument(false);
    setDocument("");
    setPaid(false);
  }

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!invoiceId || !companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-payment`, () => {
      setPaid(true);
      toast.success(t("invoices.pix.paid"));
      onPaid();
    });
    return () => socket.disconnect();
  }, [invoiceId, companyId, userId, onPaid, t]);

  const documentValid = isValidCpfCnpj(document);

  const generate = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      const body = needsDocument ? { invoiceId: invoice.id, cpfCnpj: onlyDigits(document) } : { invoiceId: invoice.id };
      const { data } = await api.post<PaymentResponse>("/subscription", body);
      setPayment(data);
      setNeedsDocument(false);
    } catch (err) {
      // Empresa sem CPF/CNPJ: pede o documento e tenta de novo.
      if (errorCode(err) === "ERR_DOCUMENT_REQUIRED" && !needsDocument) {
        setNeedsDocument(true);
      } else {
        toastError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const code = payment?.pix?.payload ?? null;
  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code).catch(() => undefined);
    toast.success(t("invoices.pix.copied"));
  };

  return (
    <Dialog open={!!invoice} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("invoices.pix.title")}</DialogTitle>
      <DialogContent dividers>
        {invoice && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t("invoices.pix.invoice")} #{invoice.id} — {invoice.detail}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }} data-testid="pix-value">
              {formatBRL(invoice.value)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("invoices.dueDate")}: {formatDay(invoice.dueDate)}
            </Typography>
          </Box>
        )}
        {paid ? (
          <Alert severity="success">{t("invoices.pix.paid")}</Alert>
        ) : payment ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {code && (
              <>
                <Typography variant="body2">{t("invoices.pix.scan")}</Typography>
                <Box sx={{ p: 1.5, bgcolor: "#fff", borderRadius: 1 }} data-testid="pix-qrcode">
                  <QRCodeSVG value={code} size={220} />
                </Box>
                <TextField fullWidth size="small" value={code} slotProps={{ htmlInput: { readOnly: true, "data-testid": "pix-code" } }} />
                <Button variant="outlined" onClick={copy}>
                  {t("invoices.pix.copy")}
                </Button>
              </>
            )}
            {payment.invoiceUrl && (
              <Button
                variant="text"
                href={payment.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="payment-invoice-url"
              >
                {t("invoices.pix.otherMethods")}
              </Button>
            )}
            <Alert severity="info" sx={{ width: "100%" }}>
              {t("invoices.pix.waiting")}
            </Alert>
          </Box>
        ) : needsDocument ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2">{t("invoices.pix.documentHelp")}</Typography>
            <TextField
              autoFocus
              fullWidth
              label={t("invoices.pix.document")}
              value={document}
              onChange={e => setDocument(formatCpfCnpj(e.target.value))}
              error={document.length > 0 && !documentValid && onlyDigits(document).length >= 11}
              helperText={document.length > 0 && !documentValid && onlyDigits(document).length >= 11 ? t("invoices.pix.invalidDocument") : " "}
              slotProps={{ htmlInput: { inputMode: "numeric", "data-testid": "payment-document" } }}
            />
            <Button variant="contained" onClick={generate} disabled={loading || !documentValid}>
              {loading ? <CircularProgress size={22} color="inherit" /> : t("invoices.pix.generate")}
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: "center" }}>
            <Button variant="contained" onClick={generate} disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : t("invoices.pix.generate")}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("invoices.pix.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
