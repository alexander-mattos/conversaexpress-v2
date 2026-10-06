"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { addHours, format } from "date-fns";
import {
  Autocomplete,
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
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ConfirmationModal from "@/components/ConfirmationModal";
import MessageVariablesPicker from "@/components/MessageVariablesPicker";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface ContactOption {
  id: number | "";
  name: string;
}

interface ScheduleData {
  id?: number;
  body: string;
  contactId: number | "";
  sendAt: string;
  sentAt?: string | null;
  status?: string;
  mediaPath?: string | null;
  mediaName?: string | null;
  contact?: ContactOption;
}

const EMPTY_CONTACT: ContactOption = { id: "", name: "" };
const DATETIME = "yyyy-MM-dd'T'HH:mm";

const schema = z.object({
  body: z.string().min(1, "Obrigatório").min(5, "Mensagem muito curta"),
  contactId: z.union([z.number(), z.literal("")]).refine(v => v !== "", "Obrigatório"),
  sendAt: z.string().min(1, "Obrigatório")
});

const capitalize = (text?: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "");

// Porta de frontend/src/components/ScheduleModal (também usada na tela de
// Agendamentos, na 3c).
export default function ScheduleModal({
  open,
  onClose,
  scheduleId,
  contactId,
  reload
}: {
  open: boolean;
  onClose: () => void;
  scheduleId?: number | null;
  contactId?: number | null;
  reload?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactOption[]>([EMPTY_CONTACT]);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const defaults = useMemo(
    () => ({ body: "", contactId: (contactId ?? "") as number | "", sendAt: format(addHours(new Date(), 1), DATETIME) }),
    [contactId]
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<{ body: string; contactId: number | ""; sendAt: string }>({ resolver: zodResolver(schema), defaultValues: defaults });
  // Remonta os campos depois de carregar o registro: sem isso, o rótulo podia
  // ficar por cima do valor quando os dados chegavam com o diálogo já aberto.
  const [formKey, setFormKey] = useState(0);
  const loadValues = useCallback(
    (values: Parameters<typeof reset>[0]) => {
      reset(values);
      setFormKey(key => key + 1);
    },
    [reset]
  );

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get<ContactOption[]>("/contacts/list", { params: { companyId: user.companyId } });
        if (active) setContacts([EMPTY_CONTACT, ...data.map(c => ({ id: c.id, name: c.name }))]);
        if (!scheduleId) {
          // Novo agendamento: parte do contato recebido (ou de nenhum).
          if (active) reset(defaults);
          return;
        }
        const { data: loaded } = await api.get<ScheduleData>(`/schedules/${scheduleId}`);
        if (!active) return;
        setSchedule(loaded);
        loadValues({ body: loaded.body, contactId: loaded.contactId, sendAt: format(new Date(loaded.sendAt), DATETIME) });
      } catch (err) {
        toastError(err);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, scheduleId, user, reset, defaults, loadValues]);

  const handleClose = () => {
    onClose();
    setAttachment(null);
    setSchedule(null);
    reset(defaults);
  };

  const onSubmit = async (values: { body: string; contactId: number | ""; sendAt: string }) => {
    const payload = { ...values, userId: user?.id };
    try {
      let id = scheduleId;
      if (scheduleId) await api.put(`/schedules/${scheduleId}`, payload);
      else id = (await api.post<{ id: number }>("/schedules", payload)).data.id;
      if (attachment && id) {
        const formData = new FormData();
        formData.append("file", attachment);
        await api.post(`/schedules/${id}/media-upload`, formData);
      }
      toast.success(t("scheduleModal.success"));
      reload?.();
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  const insertVariable = (value: string) => {
    const el = bodyRef.current;
    const current = getValues("body");
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    setValue("body", `${current.substring(0, start)}${value}${current.substring(end)}`);
    const cursor = start + value.length;
    setTimeout(() => el?.setSelectionRange(cursor, cursor), 100);
  };

  const deleteMedia = async () => {
    if (attachment) {
      setAttachment(null);
      if (attachmentInput.current) attachmentInput.current.value = "";
    }
    if (schedule?.mediaPath && schedule.id) {
      await api.delete(`/schedules/${schedule.id}/media-upload`);
      setSchedule(prev => (prev ? { ...prev, mediaPath: null } : prev));
      toast.success(t("scheduleModal.toasts.deleted"));
      reload?.();
    }
  };

  const bodyField = register("body");
  const status = schedule?.status;
  const alreadySent = !!schedule?.sentAt;

  return (
    <>
      <ConfirmationModal
        title={t("scheduleModal.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={deleteMedia}
      >
        {t("scheduleModal.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth scroll="paper">
        <DialogTitle>{status === "ERRO" ? "Erro de Envio" : `Mensagem ${capitalize(status)}`}</DialogTitle>
        <input
          type="file"
          accept=".png,.jpg,.jpeg"
          ref={attachmentInput}
          style={{ display: "none" }}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAttachment(e.target.files?.[0] ?? null)}
        />
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers key={formKey}>
            <Controller
              name="contactId"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  fullWidth
                  value={contacts.find(c => c.id === field.value) ?? EMPTY_CONTACT}
                  options={contacts}
                  onChange={(_, contact) => field.onChange(contact ? contact.id : "")}
                  getOptionLabel={option => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={params => (
                    <TextField {...params} variant="outlined" placeholder="Contato" error={!!errors.contactId} helperText={errors.contactId?.message} />
                  )}
                />
              )}
            />
            <br />
            <TextField
              rows={9}
              multiline
              label={t("scheduleModal.form.body")}
              error={!!errors.body}
              helperText={errors.body?.message}
              variant="outlined"
              margin="dense"
              fullWidth
              name={bodyField.name}
              onChange={bodyField.onChange}
              onBlur={bodyField.onBlur}
              inputRef={(el: HTMLTextAreaElement | null) => {
                bodyField.ref(el);
                bodyRef.current = el;
              }}
            />
            <MessageVariablesPicker disabled={isSubmitting} onClick={insertVariable} />
            <br />
            <TextField
              label={t("scheduleModal.form.sendAt")}
              type="datetime-local"
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.sendAt}
              helperText={errors.sendAt?.message}
              variant="outlined"
              fullWidth
              {...register("sendAt")}
            />
            {(schedule?.mediaPath || attachment) && (
              <Grid size={12}>
                <Button startIcon={<AttachFileIcon />}>{attachment ? attachment.name : schedule?.mediaName}</Button>
                <IconButton onClick={() => setConfirmationOpen(true)} color="secondary">
                  <DeleteOutlineIcon color="secondary" />
                </IconButton>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            {!attachment && !schedule?.mediaPath && (
              <Button color="primary" onClick={() => attachmentInput.current?.click()} disabled={isSubmitting} variant="outlined">
                {t("quickMessages.buttons.attach")}
              </Button>
            )}
            <Button onClick={handleClose} color="secondary" disabled={isSubmitting} variant="outlined">
              {t("scheduleModal.buttons.cancel")}
            </Button>
            {!alreadySent && (
              <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
                {scheduleId ? t("scheduleModal.buttons.okEdit") : t("scheduleModal.buttons.okAdd")}
                {isSubmitting && (
                  <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
                )}
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
