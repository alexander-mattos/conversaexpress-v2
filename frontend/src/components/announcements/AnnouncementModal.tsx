"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@mui/material";
import { green } from "@mui/material/colors";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import { api } from "@/lib/api";
import type { Announcement } from "@/lib/announcements/announcements";
import { toastError } from "@/lib/toastError";

const makeSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().trim().min(1, t("announcements.dialog.form.required")),
    text: z.string().trim().min(1, t("announcements.dialog.form.required")),
    status: z.boolean(),
    priority: z.number().int().min(1).max(3)
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;
const emptyValues: Values = { title: "", text: "", status: true, priority: 3 };
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Porta de frontend/src/components/AnnouncementModal. Botões com os rótulos
// certos (estavam invertidos) e imagem só nos formatos aceitos pelo backend.
export default function AnnouncementModal({
  open,
  onClose,
  announcementId,
  reload
}: {
  open: boolean;
  onClose: () => void;
  announcementId?: number | null;
  reload?: () => void;
}) {
  const { t } = useTranslation();
  const [record, setRecord] = useState<Announcement | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(makeSchema(t)), defaultValues: emptyValues });
  const [formKey, setFormKey] = useState(0);
  const loadValues = useCallback(
    (values: Values) => {
      reset(values);
      setFormKey(key => key + 1);
    },
    [reset]
  );

  const openKey = open ? String(announcementId ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) {
      setRecord(null);
      setAttachment(null);
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    if (!announcementId) {
      reset(emptyValues);
      return undefined;
    }
    let active = true;
    api
      .get<Announcement>(`/announcements/${announcementId}`)
      .then(({ data }) => {
        if (!active) return;
        setRecord(data);
        loadValues({ title: data.title ?? "", text: data.text ?? "", status: !!data.status, priority: Number(data.priority) || 3 });
      })
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open, announcementId, reset, loadValues]);

  const upload = async (id: number) => {
    if (!attachment) return;
    const form = new FormData();
    form.append("file", attachment);
    await api.post(`/announcements/${id}/media-upload`, form);
  };

  const onSubmit = async (values: Values) => {
    try {
      if (announcementId) {
        await api.put(`/announcements/${announcementId}`, values);
        await upload(announcementId);
      } else {
        const { data } = await api.post<Announcement>("/announcements", values);
        await upload(data.id);
      }
      toast.success(t("announcements.toasts.success"));
      reload?.();
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const removeMedia = async () => {
    if (attachment) {
      setAttachment(null);
      if (fileInput.current) fileInput.current.value = "";
    }
    if (record?.mediaPath) {
      try {
        await api.delete(`/announcements/${record.id}/media-upload`);
        setRecord(current => (current ? { ...current, mediaPath: null, mediaName: null } : current));
        toast.success(t("announcements.toasts.deleted"));
        reload?.();
      } catch (err) {
        toastError(err);
      }
    }
  };

  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error(t("announcements.imageOnly"));
      event.target.value = "";
      return;
    }
    setAttachment(file);
  };

  const hasMedia = !!(record?.mediaPath || attachment);

  return (
    <>
      <ConfirmationModal title={t("announcements.removeMedia")} open={confirmationOpen} onClose={() => setConfirmationOpen(false)} onConfirm={removeMedia}>
        {t("announcements.removeMediaMessage")}
      </ConfirmationModal>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth scroll="paper">
        <DialogTitle>{announcementId ? t("announcements.dialog.edit") : t("announcements.dialog.add")}</DialogTitle>
        <input
          type="file"
          ref={fileInput}
          accept=".png,.jpg,.jpeg,.webp"
          style={{ display: "none" }}
          data-testid="announcement-file"
          onChange={pickFile}
        />
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers key={formKey}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  {...register("title")}
                  label={t("announcements.dialog.form.title")}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  {...register("text")}
                  label={t("announcements.dialog.form.text")}
                  error={!!errors.text}
                  helperText={errors.text?.message}
                  variant="outlined"
                  margin="dense"
                  multiline
                  rows={7}
                  fullWidth
                />
              </Grid>
              <Grid size={12}>
                <FormControl variant="outlined" margin="dense" fullWidth>
                  <InputLabel id="announcement-status-label">{t("announcements.dialog.form.status")}</InputLabel>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        labelId="announcement-status-label"
                        label={t("announcements.dialog.form.status")}
                        value={field.value ? "true" : "false"}
                        onChange={e => field.onChange(e.target.value === "true")}
                      >
                        <MenuItem value="true">{t("announcements.active")}</MenuItem>
                        <MenuItem value="false">{t("announcements.inactive")}</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              <Grid size={12}>
                <FormControl variant="outlined" margin="dense" fullWidth>
                  <InputLabel id="announcement-priority-label">{t("announcements.dialog.form.priority")}</InputLabel>
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <Select
                        labelId="announcement-priority-label"
                        label={t("announcements.dialog.form.priority")}
                        value={field.value}
                        onChange={e => field.onChange(Number(e.target.value))}
                      >
                        <MenuItem value={1}>{t("announcements.high")}</MenuItem>
                        <MenuItem value={2}>{t("announcements.medium")}</MenuItem>
                        <MenuItem value={3}>{t("announcements.low")}</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
              {hasMedia && (
                <Grid size={12}>
                  <Button startIcon={<AttachFileIcon />}>{attachment ? attachment.name : record?.mediaName}</Button>
                  <IconButton onClick={() => setConfirmationOpen(true)} color="secondary" aria-label="remove image">
                    <DeleteOutlineIcon color="secondary" />
                  </IconButton>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            {!hasMedia && (
              <Button color="primary" onClick={() => fileInput.current?.click()} disabled={isSubmitting} variant="outlined">
                {t("announcements.dialog.buttons.attach")}
              </Button>
            )}
            <Button onClick={onClose} color="secondary" disabled={isSubmitting} variant="outlined">
              {t("announcements.dialog.buttons.cancel")}
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
              {announcementId ? t("announcements.dialog.buttons.edit") : t("announcements.dialog.buttons.add")}
              {isSubmitting && (
                <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
