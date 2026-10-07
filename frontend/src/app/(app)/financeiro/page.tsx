"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, FormControl, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import PaymentDialog from "@/components/invoices/PaymentDialog";
import { MainContainer, MainHeader, TableRowSkeleton, Title, mainPaperSx } from "@/components/page/PageLayout";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { formatBRL, formatDay, invoiceCompanies, invoiceStatus, type Invoice } from "@/lib/invoices/invoices";

const STATUS_KEYS = { paid: "invoices.paid", expired: "invoices.expired", open: "invoices.open" } as const;

// Faturas da própria empresa; o super vê as de todas, com filtro por empresa,
// e só paga as da própria.
export default function FinanceiroPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuper = !!user?.super;
  const [companyFilter, setCompanyFilter] = useState<number | "">("");
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

  const companies = useMemo(() => (isSuper ? invoiceCompanies(invoices) : []), [isSuper, invoices]);
  const visible = companyFilter === "" ? invoices : invoices.filter(i => i.companyId === companyFilter || i.company?.id === companyFilter);
  const columns = isSuper ? 7 : 6;

  return (
    <MainContainer>
      <PaymentDialog invoice={paying} onClose={() => setPaying(null)} onPaid={reload} />
      <MainHeader>
        <Title>{t("invoices.title")}</Title>
        {isSuper && (
          <FormControl size="small" sx={{ minWidth: 220, ml: "auto", mt: 1 }}>
            <InputLabel id="invoice-company">{t("invoices.company")}</InputLabel>
            <Select
              labelId="invoice-company"
              label={t("invoices.company")}
              value={companyFilter}
              onChange={e => setCompanyFilter(String(e.target.value) === "" ? "" : Number(e.target.value))}
              data-testid="invoice-company-filter"
            >
              <MenuItem value="">{t("invoices.allCompanies")}</MenuItem>
              {companies.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </MainHeader>
      <Paper variant="outlined" sx={mainPaperSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Id</TableCell>
              {isSuper && <TableCell align="center">{t("invoices.company")}</TableCell>}
              <TableCell align="center">{t("invoices.details")}</TableCell>
              <TableCell align="center">{t("invoices.value")}</TableCell>
              <TableCell align="center">{t("invoices.dueDate")}</TableCell>
              <TableCell align="center">{t("invoices.status")}</TableCell>
              <TableCell align="center">{t("invoices.action")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map(invoice => {
              const status = invoiceStatus(invoice);
              const own = (invoice.companyId ?? invoice.company?.id ?? user?.companyId) === user?.companyId;
              return (
                <TableRow key={invoice.id} sx={{ bgcolor: status === "expired" ? "#ffbcbc9c" : undefined }} data-testid="invoice-row">
                  <TableCell align="center">{invoice.id}</TableCell>
                  {isSuper && (
                    <TableCell align="center" data-testid="invoice-company">
                      {invoice.company?.name ?? "-"}
                    </TableCell>
                  )}
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
                      <Button size="small" variant="outlined" color="inherit" sx={{ pointerEvents: "none" }} tabIndex={-1}>
                        {t("invoices.PAID")}
                      </Button>
                    ) : !own ? (
                      "-"
                    ) : (
                      <Button size="small" variant="outlined" color="secondary" onClick={() => setPaying(invoice)}>
                        {t("invoices.PAY")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {loading && <TableRowSkeleton columns={columns} />}
            {!loading && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns} align="center">
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
