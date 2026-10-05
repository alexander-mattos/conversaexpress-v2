"use client";

import { useCallback, useEffect, useState } from "react";
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
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { green } from "@mui/material/colors";
import QueueSelect from "@/components/users/QueueSelect";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface Option {
  id: number;
  name: string;
}

interface WhatsAppData {
  name: string;
  isDefault: boolean;
  greetingMessage?: string | null;
  complationMessage?: string | null;
  outOfHoursMessage?: string | null;
  ratingMessage?: string | null;
  token?: string | null;
  promptId?: number | null;
  transferQueueId?: number | null;
  timeToTransfer?: number | null;
  expiresTicket?: number | null;
  expiresInactiveMessage?: string | null;
  queues?: { id: number }[];
}

const optionalNumber = z.string().regex(/^\d*$/);
const makeSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("whatsappModal.formErrors.name.required"))
      .min(2, t("whatsappModal.formErrors.name.short"))
      .max(50, t("whatsappModal.formErrors.name.long")),
    isDefault: z.boolean(),
    greetingMessage: z.string(),
    complationMessage: z.string(),
    outOfHoursMessage: z.string(),
    ratingMessage: z.string(),
    token: z.string(),
    promptId: z.union([z.number(), z.literal("")]),
    transferQueueId: z.union([z.number(), z.literal("")]),
    timeToTransfer: optionalNumber,
    expiresTicket: optionalNumber,
    expiresInactiveMessage: z.string()
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

const emptyValues: Values = {
  name: "",
  isDefault: false,
  greetingMessage: "",
  complationMessage: "",
  outOfHoursMessage: "",
  ratingMessage: "",
  token: "",
  promptId: "",
  transferQueueId: "",
  timeToTransfer: "",
  expiresTicket: "0",
  expiresInactiveMessage: ""
};

const toText = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
const toNumberOrNull = (value: string) => (value === "" ? null : Number(value));

// Porta de frontend/src/components/WhatsAppModal. Não envia mais o status
// nem o QR ao salvar (antes regravava o status de quando o modal abriu).
export default function WhatsAppModal({ open, onClose, whatsAppId }: { open: boolean; onClose: () => void; whatsAppId?: number | null }) {
  const { t } = useTranslation();
  const [queueIds, setQueueIds] = useState<number[]>([]);
  const [queues, setQueues] = useState<Option[]>([]);
  const [prompts, setPrompts] = useState<Option[]>([]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(makeSchema(t)), defaultValues: emptyValues });
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

  const openKey = open ? String(whatsAppId ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) setQueueIds([]);
  }

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    api
      .get<Option[]>("/queue")
      .then(({ data }) => active && setQueues(data))
      .catch(toastError);
    api
      .get<{ prompts: Option[] }>("/prompt")
      .then(({ data }) => active && setPrompts(data.prompts ?? []))
      .catch(toastError);
    if (!whatsAppId) {
      reset(emptyValues);
    } else {
      api
        .get<WhatsAppData>(`/whatsapp/${whatsAppId}`, { params: { session: 0 } })
        .then(({ data }) => {
          if (!active) return;
          loadValues({
            name: data.name ?? "",
            isDefault: !!data.isDefault,
            greetingMessage: data.greetingMessage ?? "",
            complationMessage: data.complationMessage ?? "",
            outOfHoursMessage: data.outOfHoursMessage ?? "",
            ratingMessage: data.ratingMessage ?? "",
            token: data.token ?? "",
            promptId: data.promptId ?? "",
            transferQueueId: data.transferQueueId ?? "",
            timeToTransfer: toText(data.timeToTransfer),
            expiresTicket: toText(data.expiresTicket),
            expiresInactiveMessage: data.expiresInactiveMessage ?? ""
          });
          setQueueIds(data.queues?.map(queue => queue.id) ?? []);
        })
        .catch(toastError);
    }
    return () => {
      active = false;
    };
  }, [open, whatsAppId, reset, loadValues]);

  const onSubmit = async (values: Values) => {
    const payload = {
      ...values,
      queueIds,
      promptId: values.promptId === "" ? null : values.promptId,
      transferQueueId: values.transferQueueId === "" ? null : values.transferQueueId,
      timeToTransfer: toNumberOrNull(values.timeToTransfer),
      expiresTicket: toNumberOrNull(values.expiresTicket) ?? 0,
      ...(whatsAppId ? {} : { provider: "beta", maxUseBotQueues: 3, timeUseBotQueues: 0 })
    };
    try {
      if (whatsAppId) await api.put(`/whatsapp/${whatsAppId}`, payload);
      else await api.post("/whatsapp", payload);
      toast.success(t("whatsappModal.success"));
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const message = (name: keyof Values, label: string) => (
    <TextField {...register(name)} label={label} multiline rows={4} fullWidth variant="outlined" margin="dense" />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>{whatsAppId ? t("whatsappModal.title.edit") : t("whatsappModal.title.add")}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers key={formKey}>
          <Grid container spacing={2}>
            <Grid>
              <TextField
                {...register("name")}
                label={t("whatsappModal.form.name")}
                autoFocus
                error={!!errors.name}
                helperText={errors.name?.message}
                variant="outlined"
                margin="dense"
              />
            </Grid>
            <Grid sx={{ pt: "15px" }}>
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch color="primary" checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                    label={t("whatsappModal.form.default")}
                  />
                )}
              />
            </Grid>
          </Grid>
          {message("greetingMessage", t("queueModal.form.greetingMessage"))}
          {message("complationMessage", t("queueModal.form.complationMessage"))}
          {message("outOfHoursMessage", t("queueModal.form.outOfHoursMessage"))}
          {message("ratingMessage", t("queueModal.form.ratingMessage"))}
          <TextField {...register("token")} label={t("queueModal.form.token")} fullWidth variant="outlined" margin="dense" />
          <QueueSelect
            selectedQueueIds={queueIds}
            onChange={ids => {
              // Fila e prompt se excluem, como no frontend atual.
              setQueueIds(ids);
              if (ids.length > 0) setValue("promptId", "");
            }}
          />
          <FormControl margin="dense" variant="outlined" fullWidth>
            <InputLabel id="whatsapp-prompt-label">{t("whatsappModal.form.prompt")}</InputLabel>
            <Controller
              control={control}
              name="promptId"
              render={({ field }) => (
                <Select
                  labelId="whatsapp-prompt-label"
                  label={t("whatsappModal.form.prompt")}
                  value={field.value}
                  onChange={e => {
                    const value = e.target.value as number | "";
                    field.onChange(value === "" ? "" : Number(value));
                    if (value !== "") setQueueIds([]);
                  }}
                >
                  <MenuItem value="">{t("whatsappModal.none")}</MenuItem>
                  {prompts.map(prompt => (
                    <MenuItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </FormControl>
          <Box>
            <Typography variant="h6" component="h3" sx={{ mt: 2, fontSize: "1.17em", fontWeight: "bold" }}>
              {t("whatsappModal.form.queueRedirection")}
            </Typography>
            <Typography variant="body1" sx={{ my: 1 }}>
              {t("whatsappModal.form.queueRedirectionDesc")}
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register("timeToTransfer")}
                  fullWidth
                  label={t("whatsappModal.form.timeToTransfer")}
                  variant="outlined"
                  margin="dense"
                  slotProps={{ htmlInput: { inputMode: "numeric" } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth margin="dense" variant="outlined">
                  <InputLabel id="transfer-queue-label">{t("whatsappModal.form.queue")}</InputLabel>
                  <Controller
                    control={control}
                    name="transferQueueId"
                    render={({ field }) => (
                      <Select
                        labelId="transfer-queue-label"
                        label={t("whatsappModal.form.queue")}
                        value={field.value}
                        onChange={e => {
                          const value = e.target.value as number | "";
                          field.onChange(value === "" ? "" : Number(value));
                        }}
                      >
                        <MenuItem value="">{t("whatsappModal.none")}</MenuItem>
                        {queues.map(queue => (
                          <MenuItem key={queue.id} value={queue.id}>
                            {queue.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              {...register("expiresTicket")}
              label={t("whatsappModal.form.expiresTicket")}
              fullWidth
              variant="outlined"
              margin="dense"
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
            {message("expiresInactiveMessage", t("whatsappModal.form.expiresInactiveMessage"))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary" disabled={isSubmitting} variant="outlined">
            {t("whatsappModal.buttons.cancel")}
          </Button>
          <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
            {whatsAppId ? t("whatsappModal.buttons.okEdit") : t("whatsappModal.buttons.okAdd")}
            {isSubmitting && (
              <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
