"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
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
  TextField
} from "@mui/material";
import { green } from "@mui/material/colors";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import MessageVariablesPicker from "@/components/MessageVariablesPicker";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface QuickMessageData {
  id?: number;
  shortcode: string;
  message: string;
  mediaPath?: string | null;
  mediaName?: string | null;
}

const schema = z.object({ shortcode: z.string().min(1, "Obrigatório"), message: z.string() });
type Values = z.infer<typeof schema>;

// Porta de frontend/src/components/QuickMessageDialog.
export default function QuickMessageDialog({
  open,
  onClose,
  quickMessageId,
  reload
}: {
  open: boolean;
  onClose: () => void;
  quickMessageId: number | null;
  reload?: () => void;
}) {
  const { t } = useTranslation();
  const [record, setRecord] = useState<QuickMessageData | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { shortcode: "", message: "" } });

  useEffect(() => {
    if (!open || !quickMessageId) return;
    api
      .get<QuickMessageData>(`/quick-messages/${quickMessageId}`)
      .then(({ data }) => {
        setRecord(data);
        reset({ shortcode: data.shortcode ?? "", message: data.message ?? "" });
      })
      .catch(toastError);
  }, [open, quickMessageId, reset]);

  const handleClose = () => {
    reset({ shortcode: "", message: "" });
    setRecord(null);
    setAttachment(null);
    onClose();
  };

  const uploadAttachment = async (id: number) => {
    if (!attachment) return;
    const formData = new FormData();
    formData.append("typeArch", "quickMessage");
    formData.append("file", attachment);
    await api.post(`/quick-messages/${id}/media-upload`, formData);
  };

  const onSubmit = async (values: Values) => {
    try {
      if (quickMessageId) {
        await api.put(`/quick-messages/${quickMessageId}`, values);
        await uploadAttachment(quickMessageId);
      } else {
        const { data } = await api.post<QuickMessageData>("/quick-messages", values);
        if (data.id) await uploadAttachment(data.id);
      }
      toast.success(t("quickMessages.toasts.success"));
      reload?.();
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  const deleteMedia = async () => {
    if (attachment) {
      setAttachment(null);
      if (fileInput.current) fileInput.current.value = "";
    }
    if (record?.mediaPath && record.id) {
      try {
        await api.delete(`/quick-messages/${record.id}/media-upload`);
        setRecord(prev => (prev ? { ...prev, mediaPath: null, mediaName: null } : prev));
        toast.success(t("quickMessages.toasts.deleted"));
        reload?.();
      } catch (err) {
        toastError(err);
      }
    }
  };

  const insertVariable = (value: string) => {
    const el = messageRef.current;
    const current = getValues("message");
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    setValue("message", `${current.substring(0, start)}${value}${current.substring(end)}`);
    setTimeout(() => el?.setSelectionRange(start + value.length, start + value.length), 100);
  };

  const messageField = register("message");
  const hasMedia = !!(record?.mediaPath || attachment);

  return (
    <>
      <ConfirmationModal
        title={t("quickMessages.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={deleteMedia}
      >
        {t("quickMessages.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth scroll="paper">
        <DialogTitle>{quickMessageId ? t("quickMessages.dialog.edit") : t("quickMessages.dialog.add")}</DialogTitle>
        <input
          type="file"
          ref={fileInput}
          style={{ display: "none" }}
          data-testid="quick-message-file"
          onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && setAttachment(e.target.files[0])}
        />
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  autoFocus
                  label={t("quickMessages.dialog.shortcode")}
                  error={!!errors.shortcode}
                  helperText={errors.shortcode?.message}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  {...register("shortcode")}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label={t("quickMessages.dialog.message")}
                  name={messageField.name}
                  onChange={messageField.onChange}
                  onBlur={messageField.onBlur}
                  inputRef={(el: HTMLTextAreaElement | null) => {
                    messageField.ref(el);
                    messageRef.current = el;
                  }}
                  variant="outlined"
                  margin="dense"
                  multiline
                  rows={7}
                  fullWidth
                />
              </Grid>
              <Grid>
                <MessageVariablesPicker disabled={isSubmitting} onClick={insertVariable} />
              </Grid>
              {hasMedia && (
                <Grid size={12}>
                  <Button startIcon={<AttachFileIcon />}>{attachment ? attachment.name : record?.mediaName}</Button>
                  <IconButton onClick={() => setConfirmationOpen(true)} color="secondary" aria-label="remove attachment">
                    <DeleteOutlineIcon color="secondary" />
                  </IconButton>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            {!hasMedia && (
              <Button color="primary" onClick={() => fileInput.current?.click()} disabled={isSubmitting} variant="outlined">
                {t("quickMessages.buttons.attach")}
              </Button>
            )}
            <Button onClick={handleClose} color="secondary" disabled={isSubmitting} variant="outlined">
              {t("quickMessages.buttons.cancel")}
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
              {quickMessageId ? t("quickMessages.buttons.edit") : t("quickMessages.buttons.add")}
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
