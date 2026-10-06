"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Box,
  Button,
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
import { toastError } from "@/lib/toastError";

const FLAGS = [
  ["useCampaigns", "plans.form.campaigns"],
  ["useSchedules", "plans.form.schedules"],
  ["useInternalChat", "plans.form.internalChat"],
  ["useExternalApi", "plans.form.externalApi"],
  ["useKanban", "plans.form.kanban"],
  ["useOpenAi", "Open.Ai"],
  ["useIntegrations", "plans.form.integrations"]
] as const;
type Flag = (typeof FLAGS)[number][0];

interface Plan extends Record<Flag, boolean> {
  id?: number;
  name: string;
  users: number | string;
  connections: number | string;
  queues: number | string;
  value: number | string;
}

const emptyPlan: Plan = {
  name: "",
  users: 0,
  connections: 0,
  queues: 0,
  value: 0,
  useCampaigns: true,
  useSchedules: true,
  useInternalChat: true,
  useExternalApi: true,
  useKanban: true,
  useOpenAi: true,
  useIntegrations: true
};

// Porta de frontend/src/components/PlansManager (só super).
export default function PlansTab() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<Plan>(emptyPlan);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(key => key + 1), []);

  useEffect(() => {
    let active = true;
    api
      .get<Plan[]>("/plans/list")
      .then(({ data }) => active && setPlans(data ?? []))
      .catch(err => active && toastError(err));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const set = <K extends keyof Plan>(key: K, value: Plan[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error(t("plans.toasts.error"));
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      users: Number(form.users) || 0,
      connections: Number(form.connections) || 0,
      queues: Number(form.queues) || 0,
      value: Number(form.value) || 0
    };
    try {
      if (form.id) await api.put(`/plans/${form.id}`, payload);
      else await api.post("/plans", payload);
      toast.success(t("plans.toasts.success"));
      setForm(emptyPlan);
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
      await api.delete(`/plans/${form.id}`);
      toast.success(t("plans.toasts.success"));
      setForm(emptyPlan);
      reload();
    } catch (err) {
      toastError(err);
    }
  };

  const yesNo = (value: boolean) => (value ? t("plans.form.enabled") : t("plans.form.disabled"));
  const label = (key: string) => (key.includes(".") ? t(key) : key);

  return (
    <Box>
      <ConfirmationModal title={t("plans.confirm.title")} open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={remove}>
        {t("plans.confirm.message")}
      </ConfirmationModal>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField label={t("plans.form.name")} fullWidth size="small" value={form.name} onChange={e => set("name", e.target.value)} />
        </Grid>
        {(["users", "connections", "queues"] as const).map(key => (
          <Grid key={key} size={{ xs: 6, md: 2 }}>
            <TextField label={t(`plans.form.${key}`)} type="number" fullWidth size="small" value={form[key]} onChange={e => set(key, e.target.value)} />
          </Grid>
        ))}
        <Grid size={{ xs: 6, md: 2 }}>
          <TextField label={t("plans.form.value")} type="number" fullWidth size="small" value={form.value} onChange={e => set("value", e.target.value)} />
        </Grid>
        {FLAGS.map(([key, text]) => (
          <Grid key={key} size={{ xs: 6, md: 3, lg: 12 / 7 }}>
            <FormControl fullWidth size="small">
              <InputLabel id={`plan-${key}`}>{label(text)}</InputLabel>
              <Select labelId={`plan-${key}`} label={label(text)} value={form[key] ? "true" : "false"} onChange={e => set(key, e.target.value === "true")}>
                <MenuItem value="true">{t("plans.form.enabled")}</MenuItem>
                <MenuItem value="false">{t("plans.form.disabled")}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        ))}
        <Grid size={12} sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={() => setForm(emptyPlan)}>
            {t("plans.form.clear")}
          </Button>
          {form.id && (
            <Button variant="outlined" color="secondary" onClick={() => setConfirmOpen(true)}>
              {t("plans.form.delete")}
            </Button>
          )}
          <Button variant="contained" disabled={saving} onClick={submit}>
            {t("plans.form.save")}
          </Button>
        </Grid>
      </Grid>
      <Paper variant="outlined" sx={{ mt: 2, overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "1%" }}>#</TableCell>
              <TableCell>{t("plans.form.name")}</TableCell>
              <TableCell align="center">{t("plans.form.users")}</TableCell>
              <TableCell align="center">{t("plans.form.connections")}</TableCell>
              <TableCell align="center">{t("plans.form.queues")}</TableCell>
              <TableCell align="center">{t("plans.form.value")}</TableCell>
              {FLAGS.map(([key, text]) => (
                <TableCell key={key} align="center">
                  {label(text)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map(plan => (
              <TableRow key={plan.id} data-testid="plan-row">
                <TableCell>
                  <IconButton size="small" aria-label="edit plan" onClick={() => setForm({ ...emptyPlan, ...plan })}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
                <TableCell>{plan.name}</TableCell>
                <TableCell align="center">{plan.users}</TableCell>
                <TableCell align="center">{plan.connections}</TableCell>
                <TableCell align="center">{plan.queues}</TableCell>
                <TableCell align="center">
                  {t("plans.form.money")} {Number(plan.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </TableCell>
                {FLAGS.map(([key]) => (
                  <TableCell key={key} align="center">
                    {yesNo(!!plan[key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
