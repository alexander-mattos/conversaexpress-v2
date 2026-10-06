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
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@mui/material";
import { green } from "@mui/material/colors";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface Option {
  id: number;
  name: string;
}

const MODELS = [
  { value: "gpt-3.5-turbo-1106", label: "GPT 3.5 turbo" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" }
];

const makeSchema = (t: (key: string) => string, keyRequired: boolean) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("promptModal.formErrors.name.required"))
      .min(5, t("promptModal.formErrors.name.short"))
      .max(100, t("promptModal.formErrors.name.long")),
    apiKey: keyRequired ? z.string().trim().min(1, t("promptModal.formErrors.apikey.required")) : z.string().trim(),
    prompt: z.string().trim().min(1, t("promptModal.formErrors.prompt.required")).min(50, t("promptModal.formErrors.prompt.short")),
    queueId: z.union([z.number(), z.literal("")]).refine(value => value !== "", t("promptModal.formErrors.queueId.required")),
    model: z.string().min(1, t("promptModal.formErrors.modal.required")),
    temperature: z.coerce.number<string>().min(0, t("promptModal.formErrors.temperature.required")).max(1, t("promptModal.formErrors.temperature.required")),
    maxTokens: z.coerce.number<string>().int().min(1, t("promptModal.formErrors.maxTokens.required")),
    maxMessages: z.coerce.number<string>().int().min(1, t("promptModal.formErrors.maxMessages.required"))
  });
type Input = z.input<ReturnType<typeof makeSchema>>;
type Output = z.output<ReturnType<typeof makeSchema>>;

const emptyValues: Input = {
  name: "",
  apiKey: "",
  prompt: "",
  queueId: "",
  model: "gpt-3.5-turbo-1106",
  temperature: "1",
  maxTokens: "100",
  maxMessages: "10"
};

// Porta de frontend/src/components/PromptModal. A chave da OpenAI é só de
// escrita: a tela nunca a recebe, e em branco mantém a atual.
export default function PromptModal({ open, onClose, promptId }: { open: boolean; onClose: () => void; promptId?: number | null }) {
  const { t } = useTranslation();
  const [showKey, setShowKey] = useState(false);
  const [queues, setQueues] = useState<Option[]>([]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<Input, unknown, Output>({ resolver: zodResolver(makeSchema(t, !promptId)), defaultValues: emptyValues });
  const [formKey, setFormKey] = useState(0);
  const loadValues = useCallback(
    (values: Input) => {
      reset(values);
      setFormKey(key => key + 1);
    },
    [reset]
  );

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    api
      .get<Option[]>("/queue")
      .then(({ data }) => active && setQueues(data))
      .catch(toastError);
    if (!promptId) {
      reset(emptyValues);
    } else {
      api
        .get<{ name: string; prompt: string; queueId?: number | null; model?: string; temperature?: number; maxTokens?: number; maxMessages?: number }>(
          `/prompt/${promptId}`
        )
        .then(({ data }) => {
          if (!active) return;
          loadValues({
            name: data.name ?? "",
            apiKey: "",
            prompt: data.prompt ?? "",
            queueId: data.queueId ?? "",
            model: data.model || "gpt-3.5-turbo-1106",
            temperature: String(data.temperature ?? 1),
            maxTokens: String(data.maxTokens ?? 100),
            maxMessages: String(data.maxMessages ?? 10)
          });
        })
        .catch(toastError);
    }
    return () => {
      active = false;
    };
  }, [open, promptId, reset, loadValues]);

  const onSubmit = async (values: Output) => {
    const { apiKey, ...rest } = values;
    const payload = { ...rest, ...(apiKey ? { apiKey } : {}) };
    try {
      if (promptId) await api.put(`/prompt/${promptId}`, payload);
      else await api.post("/prompt", payload);
      toast.success(t("promptModal.success"));
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const line = { display: "flex", "& > *:not(:last-child)": { mr: 1 } } as const;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>{promptId ? t("promptModal.title.edit") : t("promptModal.title.add")}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers key={formKey}>
          <TextField
            {...register("name")}
            label={t("promptModal.form.name")}
            error={!!errors.name}
            helperText={errors.name?.message}
            variant="outlined"
            margin="dense"
            fullWidth
          />
          <TextField
            {...register("apiKey")}
            label={t("promptModal.form.apikey")}
            type={showKey ? "text" : "password"}
            autoComplete="off"
            placeholder={promptId ? t("promptModal.apiKeyKeep") : undefined}
            error={!!errors.apiKey}
            helperText={errors.apiKey?.message ?? (promptId ? t("promptModal.apiKeyKeep") : undefined)}
            variant="outlined"
            margin="dense"
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="toggle api key" onClick={() => setShowKey(value => !value)}>
                      {showKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
          <TextField
            {...register("prompt")}
            label={t("promptModal.form.prompt")}
            error={!!errors.prompt}
            helperText={errors.prompt?.message}
            variant="outlined"
            margin="dense"
            fullWidth
            rows={10}
            multiline
          />
          <FormControl fullWidth margin="dense" variant="outlined" error={!!errors.queueId}>
            <InputLabel id="prompt-queue-label">{t("queueSelect.inputLabel")}</InputLabel>
            <Controller
              control={control}
              name="queueId"
              render={({ field }) => (
                <Select
                  labelId="prompt-queue-label"
                  label={t("queueSelect.inputLabel")}
                  value={field.value}
                  onChange={e => {
                    const value = e.target.value as number | "";
                    field.onChange(value === "" ? "" : Number(value));
                  }}
                >
                  {queues.map(queue => (
                    <MenuItem key={queue.id} value={queue.id}>
                      {queue.name}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
            {errors.queueId && <FormHelperText>{errors.queueId.message}</FormHelperText>}
          </FormControl>
          <Box sx={line}>
            <FormControl fullWidth margin="dense" variant="outlined">
              <InputLabel id="prompt-model-label">{t("promptModal.form.model")}</InputLabel>
              <Controller
                control={control}
                name="model"
                render={({ field }) => (
                  <Select {...field} labelId="prompt-model-label" label={t("promptModal.form.model")}>
                    {MODELS.map(model => (
                      <MenuItem key={model.value} value={model.value}>
                        {model.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
            <TextField
              {...register("temperature")}
              label={t("promptModal.form.temperature")}
              type="number"
              error={!!errors.temperature}
              helperText={errors.temperature?.message}
              variant="outlined"
              margin="dense"
              fullWidth
              slotProps={{ htmlInput: { step: "0.1", min: "0", max: "1" } }}
            />
          </Box>
          <Box sx={line}>
            <TextField
              {...register("maxTokens")}
              label={t("promptModal.form.max_tokens")}
              type="number"
              error={!!errors.maxTokens}
              helperText={errors.maxTokens?.message}
              variant="outlined"
              margin="dense"
              fullWidth
            />
            <TextField
              {...register("maxMessages")}
              label={t("promptModal.form.max_messages")}
              type="number"
              error={!!errors.maxMessages}
              helperText={errors.maxMessages?.message}
              variant="outlined"
              margin="dense"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary" disabled={isSubmitting} variant="outlined">
            {t("promptModal.buttons.cancel")}
          </Button>
          <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
            {promptId ? t("promptModal.buttons.okEdit") : t("promptModal.buttons.okAdd")}
            {isSubmitting && (
              <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
