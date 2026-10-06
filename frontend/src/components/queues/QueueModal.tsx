"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useForm, useWatch } from "react-hook-form";
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
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField
} from "@mui/material";
import { green } from "@mui/material/colors";
import ColorizeIcon from "@mui/icons-material/Colorize";
import ColorPickerDialog from "@/components/ColorPickerDialog";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { normalizeSchedules, type QueueSchedule } from "@/lib/queues/schedules";
import QueueOptions from "./QueueOptions";
import SchedulesForm from "./SchedulesForm";

interface Option {
  id: number;
  name: string;
}

interface QueueData {
  name: string;
  color: string;
  greetingMessage?: string | null;
  outOfHoursMessage?: string | null;
  orderQueue?: number | string | null;
  integrationId?: number | null;
  promptId?: number | null;
  schedules?: QueueSchedule[] | null;
}

const optionalId = z.union([z.number(), z.literal("")]);

// Mesmas regras do frontend atual; a cor segue o que o backend aceita.
const makeSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(1, t("queueModal.form.nameRequired")).min(2, t("queueModal.form.nameShort")).max(50, t("queueModal.form.nameLong")),
    color: z.string().trim().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, t("queueModal.colorInvalid")),
    orderQueue: z.string().regex(/^\d*$/),
    integrationId: optionalId,
    promptId: optionalId,
    greetingMessage: z.string(),
    outOfHoursMessage: z.string()
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

const emptyValues: Values = {
  name: "",
  color: "",
  orderQueue: "",
  integrationId: "",
  promptId: "",
  greetingMessage: "",
  outOfHoursMessage: ""
};

// Porta de frontend/src/components/QueueModal.
export default function QueueModal({
  open,
  onClose,
  queueId
}: {
  open: boolean;
  onClose: () => void;
  queueId?: number | null;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);
  const [schedules, setSchedules] = useState<QueueSchedule[]>(() => normalizeSchedules(null));
  const [integrations, setIntegrations] = useState<Option[]>([]);
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
  const color = useWatch({ control, name: "color" });
  const colorField = register("color");

  // Listas auxiliares e configuração de horários por fila.
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    api
      .get<{ key: string; value: string }[]>("/settings")
      .then(({ data }) => active && setSchedulesEnabled(Array.isArray(data) && data.some(s => s.key === "scheduleType" && s.value === "queue")))
      .catch(() => undefined);
    api
      .get<{ queueIntegrations: Option[] }>("/queueIntegration")
      .then(({ data }) => active && setIntegrations(data.queueIntegrations ?? []))
      .catch(toastError);
    api
      .get<{ prompts: Option[] }>("/prompt")
      .then(({ data }) => active && setPrompts(data.prompts ?? []))
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open]);

  // Abrir para adicionar sempre começa do zero (antes herdava horários e
  // prompt da última fila editada).
  const openKey = open ? String(queueId ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) {
      setTab(0);
      setSchedules(normalizeSchedules(null));
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    if (!queueId) {
      reset(emptyValues);
      return undefined;
    }
    let active = true;
    api
      .get<QueueData>(`/queue/${queueId}`)
      .then(({ data }) => {
        if (!active) return;
        loadValues({
          name: data.name ?? "",
          color: data.color ?? "",
          orderQueue: data.orderQueue === null || data.orderQueue === undefined ? "" : String(data.orderQueue),
          integrationId: data.integrationId ?? "",
          promptId: data.promptId ?? "",
          greetingMessage: data.greetingMessage ?? "",
          outOfHoursMessage: data.outOfHoursMessage ?? ""
        });
        setSchedules(normalizeSchedules(data.schedules));
      })
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open, queueId, reset, loadValues]);

  const onSubmit = async (values: Values) => {
    const payload = {
      ...values,
      orderQueue: values.orderQueue,
      integrationId: values.integrationId === "" ? null : values.integrationId,
      promptId: values.promptId === "" ? null : values.promptId,
      schedules
    };
    try {
      if (queueId) await api.put(`/queue/${queueId}`, payload);
      else await api.post("/queue", payload);
      toast.success(t("queueModal.toasts.success"));
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const select = (name: "integrationId" | "promptId", label: string, items: Option[]) => (
    <FormControl variant="outlined" margin="dense" fullWidth>
      <InputLabel id={`${name}-label`}>{label}</InputLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            labelId={`${name}-label`}
            label={label}
            value={field.value}
            onChange={e => {
              const value = e.target.value as number | "";
              field.onChange(value === "" ? "" : Number(value));
            }}
          >
            <MenuItem value="">{t("queueModal.none")}</MenuItem>
            {items.map(item => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </Select>
        )}
      />
    </FormControl>
  );

  return (
    <Dialog maxWidth="md" fullWidth open={open} onClose={onClose} scroll="paper">
      <DialogTitle>{queueId ? t("queueModal.title.edit") : t("queueModal.title.add")}</DialogTitle>
      <Tabs value={tab} indicatorColor="primary" textColor="primary" onChange={(_, value: number) => setTab(value)}>
        <Tab label={t("queueModal.tabs.queueData")} />
        {schedulesEnabled && <Tab label={t("queueModal.tabs.attendanceTime")} />}
      </Tabs>
      <ColorPickerDialog
        open={pickerOpen}
        current={color}
        onClose={() => setPickerOpen(false)}
        onChange={value => setValue("color", value, { shouldValidate: true })}
      />
      {tab === 0 && (
        <Paper component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ overflowY: "auto" }}>
          <DialogContent dividers key={formKey}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <TextField
                {...register("name")}
                label={t("queueModal.form.name")}
                autoFocus
                error={!!errors.name}
                helperText={errors.name?.message}
                variant="outlined"
                margin="dense"
                sx={{ flex: 1 }}
              />
              <TextField
                name={colorField.name}
                onChange={colorField.onChange}
                onBlur={colorField.onBlur}
                inputRef={colorField.ref}
                label={t("queueModal.form.color")}
                error={!!errors.color}
                helperText={errors.color?.message}
                variant="outlined"
                margin="dense"
                sx={{ flex: 1 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box data-testid="queue-color-swatch" sx={{ width: 20, height: 20, backgroundColor: color }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <IconButton size="small" aria-label="pick color" onClick={() => setPickerOpen(true)}>
                        <ColorizeIcon />
                      </IconButton>
                    )
                  }
                }}
              />
              <TextField
                {...register("orderQueue")}
                label={t("queueModal.form.orderQueue")}
                variant="outlined"
                margin="dense"
                error={!!errors.orderQueue}
                slotProps={{ htmlInput: { inputMode: "numeric" } }}
                sx={{ flex: 1 }}
              />
            </Box>
            {select("integrationId", t("queueModal.form.integrationId"), integrations)}
            {select("promptId", t("whatsappModal.form.prompt"), prompts)}
            <Box sx={{ mt: "5px" }}>
              <TextField
                {...register("greetingMessage")}
                label={t("queueModal.form.greetingMessage")}
                multiline
                rows={5}
                fullWidth
                variant="outlined"
                margin="dense"
              />
              {schedulesEnabled && (
                <TextField
                  {...register("outOfHoursMessage")}
                  label={t("queueModal.form.outOfHoursMessage")}
                  multiline
                  rows={5}
                  fullWidth
                  variant="outlined"
                  margin="dense"
                />
              )}
            </Box>
            <QueueOptions queueId={queueId} />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} color="secondary" disabled={isSubmitting} variant="outlined">
              {t("queueModal.buttons.cancel")}
            </Button>
            <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
              {queueId ? t("queueModal.buttons.okEdit") : t("queueModal.buttons.okAdd")}
              {isSubmitting && (
                <CircularProgress
                  size={24}
                  sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }}
                />
              )}
            </Button>
          </DialogActions>
        </Paper>
      )}
      {tab === 1 && (
        <Paper sx={{ p: "20px" }}>
          <SchedulesForm
            initialValues={schedules}
            onSubmit={values => {
              setSchedules(values);
              toast.success(t("queueModal.toasts.info"));
              setTab(0);
            }}
          />
        </Paper>
      )}
    </Dialog>
  );
}
