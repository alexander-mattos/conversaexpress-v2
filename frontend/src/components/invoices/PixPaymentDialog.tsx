"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
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

interface PixResponse {
  qrcode?: { qrcode?: string; imagemQrcode?: string };
}

// Substitui o checkout do frontend atual (endereço e cartão, que o backend
// ignorava): a fatura gera um Pix e a tela fecha quando ele é confirmado.
export default function PixPaymentDialog({ invoice, onClose, onPaid }: { invoice: Invoice | null; onClose: () => void; onPaid: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const invoiceId = invoice?.id ?? null;
  const [lastId, setLastId] = useState<number | null>(null);
  if (invoiceId !== lastId) {
    setLastId(invoiceId);
    setCode(null);
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

  const generate = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      const { data } = await api.post<PixResponse>("/subscription", { invoiceId: invoice.id });
      setCode(data.qrcode?.qrcode ?? null);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

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
        ) : code ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Typography variant="body2">{t("invoices.pix.scan")}</Typography>
            <Box sx={{ p: 1.5, bgcolor: "#fff", borderRadius: 1 }} data-testid="pix-qrcode">
              <QRCodeSVG value={code} size={220} />
            </Box>
            <TextField fullWidth size="small" value={code} slotProps={{ htmlInput: { readOnly: true, "data-testid": "pix-code" } }} />
            <Button variant="outlined" onClick={copy}>
              {t("invoices.pix.copy")}
            </Button>
            <Alert severity="info" sx={{ width: "100%" }}>
              {t("invoices.pix.waiting")}
            </Alert>
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
