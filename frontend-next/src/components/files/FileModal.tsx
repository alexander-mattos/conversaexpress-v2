"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
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
  Grid,
  IconButton,
  TextField,
  Typography
} from "@mui/material";
import { green } from "@mui/material/colors";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { api } from "@/lib/api";
import { assignSavedIds, buildUploadForm, type FileRow, type SavedOption } from "@/lib/files/options";
import { toastError } from "@/lib/toastError";

const makeSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t("fileModal.formErrors.name.required")).min(3, t("fileModal.formErrors.name.short")),
    message: z.string().trim().min(1, t("fileModal.formErrors.message.required"))
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

let rowCounter = 0;
const newRow = (): FileRow => ({ key: `row-${(rowCounter += 1)}`, name: "" });

// Porta de frontend/src/components/FileModal. O upload é aguardado e cada
// arquivo vai para a opção certa (pelo id), não pela posição.
export default function FileModal({
  open,
  onClose,
  fileListId,
  reload
}: {
  open: boolean;
  onClose: () => void;
  fileListId?: number | null;
  reload?: () => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<FileRow[]>(() => [newRow()]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(makeSchema(t)), defaultValues: { name: "", message: "" } });
  const [formKey, setFormKey] = useState(0);
  const loadValues = useCallback(
    (values: Values) => {
      reset(values);
      setFormKey(key => key + 1);
    },
    [reset]
  );

  const openKey = open ? String(fileListId ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) setRows(fileListId ? [] : [newRow()]);
  }

  useEffect(() => {
    if (!open) return undefined;
    if (!fileListId) {
      reset({ name: "", message: "" });
      return undefined;
    }
    let active = true;
    api
      .get<{ name: string; message: string; options?: SavedOption[] }>(`/files/${fileListId}`)
      .then(({ data }) => {
        if (!active) return;
        loadValues({ name: data.name ?? "", message: data.message ?? "" });
        setRows(
          [...(data.options ?? [])]
            .sort((a, b) => a.id - b.id)
            .map(option => ({ key: `id-${option.id}`, id: option.id, name: option.name ?? "", path: option.path }))
        );
      })
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open, fileListId, reset, loadValues]);

  const updateRow = (key: string, patch: Partial<FileRow>) =>
    setRows(current => current.map(row => (row.key === key ? { ...row, ...patch } : row)));

  const onSubmit = async (values: Values) => {
    const payload = { ...values, options: rows.map(row => ({ ...(row.id ? { id: row.id } : {}), name: row.name })) };
    try {
      const { data } = fileListId
        ? await api.put<{ id: number; options: SavedOption[] }>(`/files/${fileListId}`, payload)
        : await api.post<{ id: number; options: SavedOption[] }>("/files", payload);
      const form = buildUploadForm(assignSavedIds(rows, data.options ?? []));
      if (form) await api.post(`/files/uploadList/${data.id}`, form);
      toast.success(t("fileModal.success"));
      reload?.();
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>{fileListId ? t("fileModal.title.edit") : t("fileModal.title.add")}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers key={formKey}>
          <TextField
            {...register("name")}
            label={t("fileModal.form.name")}
            error={!!errors.name}
            helperText={errors.name?.message}
            variant="outlined"
            margin="dense"
            fullWidth
          />
          <br />
          <TextField
            {...register("message")}
            label={t("fileModal.form.message")}
            multiline
            minRows={5}
            fullWidth
            error={!!errors.message}
            helperText={errors.message?.message}
            variant="outlined"
            margin="dense"
          />
          <Typography variant="subtitle1" sx={{ mb: 1, mt: "12px" }}>
            {t("fileModal.form.fileOptions")}
          </Typography>
          {rows.map((row, index) => (
            <Box key={row.key} data-testid="file-option">
              <Grid container spacing={0}>
                <Grid size={{ xs: 6, md: 10 }}>
                  <TextField
                    label={t("fileModal.form.extraName")}
                    value={row.name}
                    onChange={e => updateRow(row.key, { name: e.target.value })}
                    variant="outlined"
                    margin="dense"
                    multiline
                    fullWidth
                    minRows={2}
                  />
                </Grid>
                <Grid size={{ xs: 2, md: 2 }} sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <input
                    type="file"
                    id={`file-upload-${row.key}`}
                    data-testid={`file-input-${index}`}
                    style={{ display: "none" }}
                    onChange={e => updateRow(row.key, { file: e.target.files?.[0] ?? null })}
                  />
                  <label htmlFor={`file-upload-${row.key}`}>
                    <IconButton component="span" aria-label="attach file">
                      <AttachFileIcon />
                    </IconButton>
                  </label>
                  <IconButton size="small" aria-label="remove file option" onClick={() => setRows(current => current.filter(item => item.key !== row.key))}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Grid>
                <Grid size={12}>{row.file?.name ?? row.path ?? ""}</Grid>
              </Grid>
            </Box>
          ))}
          <Button fullWidth sx={{ mt: 1 }} variant="outlined" color="primary" onClick={() => setRows(current => [...current, newRow()])}>
            {`+ ${t("fileModal.buttons.fileOptions")}`}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary" disabled={isSubmitting} variant="outlined">
            {t("fileModal.buttons.cancel")}
          </Button>
          <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
            {fileListId ? t("fileModal.buttons.okEdit") : t("fileModal.buttons.okAdd")}
            {isSubmitting && (
              <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
