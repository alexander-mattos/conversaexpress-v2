"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ConfirmationModal from "@/components/ConfirmationModal";
import { api } from "@/lib/api";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/lib/billing/cpfCnpj";
import { toastError } from "@/lib/toastError";
import { RECURRENCES, addRecurrence, dueDateColor } from "@/lib/settings/settings";
import { formatDateTime } from "@/lib/campaigns/campaigns";

interface Plan {
  id: number;
  name: string;
}

interface Company {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  planId?: number | null;
  plan?: Plan | null;
  status?: boolean;
  dueDate?: string | null;
  recurrence?: string | null;
  createdAt?: string;
  settings?: { key: string; value: string }[];
}

interface Form {
  id?: number;
  name: string;
  email: string;
  phone: string;
  document: string;
  planId: string;
  status: boolean;
  campaignsEnabled: boolean;
  dueDate: string;
  recurrence: string;
}

const emptyForm: Form = { name: "", email: "", phone: "", document: "", planId: "", status: true, campaignsEnabled: false, dueDate: "", recurrence: "" };

const toForm = (company: Company): Form => ({
  id: company.id,
  name: company.name ?? "",
  email: company.email ?? "",
  phone: company.phone ?? "",
  document: company.document ? formatCpfCnpj(company.document) : "",
  planId: company.planId ? String(company.planId) : "",
  status: company.status !== false,
  campaignsEnabled: !!company.settings?.some(s => s.key === "campaignsEnabled" && s.value === "true"),
  dueDate: company.dueDate ? String(company.dueDate).slice(0, 10) : "",
  recurrence: company.recurrence ?? ""
});

// Porta de frontend/src/components/CompaniesManager (só super).
export default function CompaniesTab() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generated, setGenerated] = useState<{ email: string; password: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(key => key + 1), []);

  useEffect(() => {
    let active = true;
    Promise.all([api.get<Company[]>("/companies/list"), api.get<Plan[]>("/plans/list")])
      .then(([companyList, planList]) => {
        if (!active) return;
        setCompanies(companyList.data ?? []);
        setPlans(planList.data ?? []);
      })
      .catch(err => active && toastError(err));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name.trim() || !form.planId) {
      toast.error(t("settings.company.toasts.error"));
      return;
    }
    if (form.document && !isValidCpfCnpj(form.document)) {
      toast.error(t("backendErrors.ERR_INVALID_DOCUMENT"));
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      document: onlyDigits(form.document),
      planId: Number(form.planId),
      status: form.status,
      campaignsEnabled: form.campaignsEnabled,
      dueDate: form.dueDate || null,
      recurrence: form.recurrence
    };
    try {
      if (form.id) {
        await api.put(`/companies/${form.id}`, payload);
      } else {
        const { data } = await api.post<{ email: string; generatedPassword?: string }>("/companies", payload);
        if (data?.generatedPassword) setGenerated({ email: data.email, password: data.generatedPassword });
      }
      toast.success(t("settings.company.toasts.success"));
      setForm(emptyForm);
      reload();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!form.id) return;
    try {
      await api.delete(`/companies/${form.id}`);
      toast.success(t("settings.company.toasts.success"));
      setForm(emptyForm);
      reload();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Box>
      <ConfirmationModal
        title={t("settings.company.confirmModal.title")}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={remove}
      >
        {t("settings.company.confirmModal.confirm")}
      </ConfirmationModal>
      <Dialog open={!!generated} onClose={() => setGenerated(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("settings.company.generatedPassword.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t("settings.company.generatedPassword.message")}</DialogContentText>
          <DialogContentText>
            {t("settings.company.generatedPassword.email")}: <strong>{generated?.email}</strong>
          </DialogContentText>
          <DialogContentText>
            {t("settings.company.generatedPassword.password")}: <strong style={{ fontFamily: "monospace" }}>{generated?.password}</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={async () => {
              if (!generated) return;
              await navigator.clipboard.writeText(generated.password).catch(() => undefined);
              toast.success(t("settings.company.generatedPassword.copied"));
            }}
          >
            {t("settings.company.generatedPassword.copy")}
          </Button>
          <Button variant="contained" onClick={() => setGenerated(null)}>
            {t("settings.company.generatedPassword.close")}
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField label={t("settings.company.form.name")} fullWidth size="small" value={form.name} onChange={e => set("name", e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField label={t("settings.company.form.email")} fullWidth size="small" value={form.email} onChange={e => set("email", e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField label={t("settings.company.form.phone")} fullWidth size="small" value={form.phone} onChange={e => set("phone", e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            label={t("settings.company.form.document")}
            fullWidth
            size="small"
            value={form.document}
            onChange={e => set("document", formatCpfCnpj(e.target.value))}
            slotProps={{ htmlInput: { inputMode: "numeric", "data-testid": "company-document" } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="company-plan">{t("settings.company.form.plan")}</InputLabel>
            <Select labelId="company-plan" label={t("settings.company.form.plan")} value={form.planId} onChange={e => set("planId", String(e.target.value))} data-testid="company-plan">
              {plans.map(plan => (
                <MenuItem key={plan.id} value={String(plan.id)}>
                  {plan.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="company-status">{t("settings.company.form.status")}</InputLabel>
            <Select labelId="company-status" label={t("settings.company.form.status")} value={form.status ? "true" : "false"} onChange={e => set("status", e.target.value === "true")}>
              <MenuItem value="true">{t("settings.company.form.yes")}</MenuItem>
              <MenuItem value="false">{t("settings.company.form.no")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="company-campaigns">{t("settings.company.form.campanhas")}</InputLabel>
            <Select
              labelId="company-campaigns"
              label={t("settings.company.form.campanhas")}
              value={form.campaignsEnabled ? "true" : "false"}
              onChange={e => set("campaignsEnabled", e.target.value === "true")}
            >
              <MenuItem value="true">{t("settings.company.form.enabled")}</MenuItem>
              <MenuItem value="false">{t("settings.company.form.disabled")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            label={t("settings.company.form.dueDate")}
            type="date"
            fullWidth
            size="small"
            value={form.dueDate}
            onChange={e => set("dueDate", e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="company-recurrence">{t("settings.company.form.recurrence")}</InputLabel>
            <Select labelId="company-recurrence" label={t("settings.company.form.recurrence")} value={form.recurrence} onChange={e => set("recurrence", String(e.target.value))}>
              {RECURRENCES.map(item => (
                <MenuItem key={item} value={item}>
                  {item === "MENSAL" ? t("settings.company.form.monthly") : item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={12} sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={() => setForm(emptyForm)}>
            {t("settings.company.buttons.clear")}
          </Button>
          {form.id && (
            <>
              <Button variant="outlined" color="secondary" onClick={() => setConfirmOpen(true)}>
                {t("settings.company.buttons.delete")}
              </Button>
              <Button variant="outlined" onClick={() => set("dueDate", addRecurrence(form.dueDate, form.recurrence))}>
                {t("settings.company.buttons.expire")}
              </Button>
            </>
          )}
          <Button variant="contained" color="primary" disabled={saving} onClick={submit}>
            {t("settings.company.buttons.save")}
          </Button>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ mt: 2, overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: "1%" }}>
                #
              </TableCell>
              <TableCell>{t("settings.company.form.name")}</TableCell>
              <TableCell>{t("settings.company.form.email")}</TableCell>
              <TableCell>{t("settings.company.form.phone")}</TableCell>
              <TableCell>{t("settings.company.form.document")}</TableCell>
              <TableCell>{t("settings.company.form.plan")}</TableCell>
              <TableCell>{t("settings.company.form.campanhas")}</TableCell>
              <TableCell>{t("settings.company.form.status")}</TableCell>
              <TableCell>{t("settings.company.form.createdAt")}</TableCell>
              <TableCell>{t("settings.company.form.expire")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map(company => {
              const campaigns = company.settings?.some(s => s.key === "campaignsEnabled" && s.value === "true");
              return (
                <TableRow key={company.id} sx={{ bgcolor: dueDateColor(company.dueDate) }} data-testid="company-row">
                  <TableCell align="center">
                    <IconButton size="small" aria-label="edit company" onClick={() => setForm(toForm(company))}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                  <TableCell>{company.name || "-"}</TableCell>
                  <TableCell>{company.email || "-"}</TableCell>
                  <TableCell>{company.phone || "-"}</TableCell>
                  <TableCell>{company.document ? formatCpfCnpj(company.document) : "-"}</TableCell>
                  <TableCell>{company.plan?.name || "-"}</TableCell>
                  <TableCell>{campaigns ? t("settings.company.form.enabled") : t("settings.company.form.disabled")}</TableCell>
                  <TableCell>{company.status === false ? t("settings.company.form.no") : t("settings.company.form.yes")}</TableCell>
                  <TableCell>{formatDateTime(company.createdAt).slice(0, 10)}</TableCell>
                  <TableCell>
                    {company.dueDate ? formatDateTime(company.dueDate).slice(0, 10) : "-"}
                    <br />
                    <span>{company.recurrence}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
