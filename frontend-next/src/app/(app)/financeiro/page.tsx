"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Paper, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import PixPaymentDialog from "@/components/invoices/PixPaymentDialog";
import { MainContainer, MainHeader, TableRowSkeleton, Title, mainPaperSx } from "@/components/page/PageLayout";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { formatBRL, formatDay, invoiceStatus, type Invoice } from "@/lib/invoices/invoices";

const STATUS_KEYS = { paid: "invoices.paid", expired: "invoices.expired", open: "invoices.open" } as const;

// Porta de frontend/src/pages/Financeiro (faturas da própria empresa).
export default function FinanceiroPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(key => key + 1), []);

  useEffect(() => {
    let active = true;
    api
      .get<Invoice[]>("/invoices/all")
      .then(({ data }) => active && setInvoices(Array.isArray(data) ? data : []))
      .catch(err => active && toastError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <MainContainer>
      <PixPaymentDialog invoice={paying} onClose={() => setPaying(null)} onPaid={reload} />
      <MainHeader>
        <Title>{t("invoices.title")}</Title>
      </MainHeader>
      <Paper variant="outlined" sx={mainPaperSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Id</TableCell>
              <TableCell align="center">{t("invoices.details")}</TableCell>
              <TableCell align="center">{t("invoices.value")}</TableCell>
              <TableCell align="center">{t("invoices.dueDate")}</TableCell>
              <TableCell align="center">{t("invoices.status")}</TableCell>
              <TableCell align="center">{t("invoices.action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map(invoice => {
              const status = invoiceStatus(invoice);
              return (
                <TableRow key={invoice.id} sx={{ bgcolor: status === "expired" ? "#ffbcbc9c" : undefined }} data-testid="invoice-row">
                  <TableCell align="center">{invoice.id}</TableCell>
                  <TableCell align="center">{invoice.detail}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>
                    {formatBRL(invoice.value)}
                  </TableCell>
                  <TableCell align="center">{formatDay(invoice.dueDate)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }} data-testid="invoice-status">
                    {t(STATUS_KEYS[status])}
                  </TableCell>
                  <TableCell align="center">
                    {status === "paid" ? (
                      <Button size="small" variant="outlined" disabled>
                        {t("invoices.PAID")}
                      </Button>
                    ) : (
                      <Button size="small" variant="outlined" color="secondary" onClick={() => setPaying(invoice)}>
                        {t("invoices.PAY")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {loading && <TableRowSkeleton columns={6} />}
            {!loading && invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t("invoices.pix.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
