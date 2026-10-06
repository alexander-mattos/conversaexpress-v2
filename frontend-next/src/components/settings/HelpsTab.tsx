"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Box, Button, Grid, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ConfirmationModal from "@/components/ConfirmationModal";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface Help {
  id?: number;
  title: string;
  video: string;
  description: string;
}
const emptyHelp: Help = { title: "", video: "", description: "" };

// Porta de frontend/src/components/HelpsManager (só super).
export default function HelpsTab() {
  const { t } = useTranslation();
  const [helps, setHelps] = useState<Help[]>([]);
  const [form, setForm] = useState<Help>(emptyHelp);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(key => key + 1), []);

  useEffect(() => {
    let active = true;
    api
      .get<Help[]>("/helps/list")
      .then(({ data }) => active && setHelps(data ?? []))
      .catch(err => active && toastError(err));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const set = (key: keyof Help, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error(t("settings.helps.toasts.error"));
      return;
    }
    setSaving(true);
    // Descrição vazia não vai (a API exige 3+ caracteres quando enviada).
    const payload = { title: form.title.trim(), video: form.video.trim(), ...(form.description.trim() ? { description: form.description } : {}) };
    try {
      if (form.id) await api.put(`/helps/${form.id}`, payload);
      else await api.post("/helps", payload);
      toast.success(t("settings.helps.toasts.success"));
      setForm(emptyHelp);
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
      await api.delete(`/helps/${form.id}`);
      toast.success(t("settings.helps.toasts.success"));
      setForm(emptyHelp);
      reload();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Box>
      <ConfirmationModal title={t("settings.helps.confirmModal.title")} open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={remove}>
        {t("settings.helps.confirmModal.confirm")}
      </ConfirmationModal>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label={t("settings.helps.grid.title")} fullWidth size="small" value={form.title} onChange={e => set("title", e.target.value)} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField label={t("settings.helps.grid.video")} fullWidth size="small" value={form.video} onChange={e => set("video", e.target.value)} />
        </Grid>
        <Grid size={12}>
          <TextField
            label={t("settings.helps.grid.description")}
            fullWidth
            multiline
            rows={5}
            value={form.description}
            onChange={e => set("description", e.target.value)}
          />
        </Grid>
        <Grid size={12} sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={() => setForm(emptyHelp)}>
            {t("settings.helps.buttons.clean")}
          </Button>
          {form.id && (
            <Button variant="outlined" color="secondary" onClick={() => setConfirmOpen(true)}>
              {t("settings.helps.buttons.delete")}
            </Button>
          )}
          <Button variant="contained" disabled={saving} onClick={submit}>
            {t("settings.helps.buttons.save")}
          </Button>
        </Grid>
      </Grid>
      <Paper variant="outlined" sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "1%" }}>#</TableCell>
              <TableCell>{t("settings.helps.grid.title")}</TableCell>
              <TableCell>{t("settings.helps.grid.description")}</TableCell>
              <TableCell>{t("settings.helps.grid.video")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {helps.map(help => (
              <TableRow key={help.id} data-testid="help-row">
                <TableCell>
                  <IconButton size="small" aria-label="edit help" onClick={() => setForm({ ...emptyHelp, ...help })}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
                <TableCell>{help.title || "-"}</TableCell>
                <TableCell>{help.description || "-"}</TableCell>
                <TableCell>{help.video || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
