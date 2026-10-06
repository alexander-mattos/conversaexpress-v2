"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@mui/material";
import { green } from "@mui/material/colors";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

const TYPES = ["dialogflow", "n8n", "webhook", "typebot"] as const;
const URL_TYPES = ["n8n", "webhook", "typebot"];

const makeSchema = (t: (key: string) => string) =>
  z
    .object({
      type: z.enum(TYPES),
      name: z.string().trim().min(2, t("queueModal.form.nameShort")).max(50, t("queueModal.form.nameLong")),
      projectName: z.string(),
      jsonContent: z.string(),
      language: z.string(),
      urlN8N: z.string().trim(),
      typebotSlug: z.string().trim(),
      typebotExpires: z.string().regex(/^\d*$/),
      typebotDelayMessage: z.string().regex(/^\d*$/),
      typebotKeywordFinish: z.string(),
      typebotKeywordRestart: z.string(),
      typebotUnknownMessage: z.string(),
      typebotRestartMessage: z.string()
    })
    .superRefine((values, ctx) => {
      // Antes só o nome era validado (os demais "required" eram só no HTML).
      if (URL_TYPES.includes(values.type) && !/^https?:\/\/\S+$/i.test(values.urlN8N)) {
        ctx.addIssue({ code: "custom", path: ["urlN8N"], message: t("backendErrors.ERR_INTEGRATION_INVALID_URL") });
      }
      if (values.type === "typebot" && !values.typebotSlug) {
        ctx.addIssue({ code: "custom", path: ["typebotSlug"], message: t("queueIntegrationModal.form.typebotSlug") });
      }
    });
type Values = z.infer<ReturnType<typeof makeSchema>>;

const emptyValues: Values = {
  type: "typebot",
  name: "",
  projectName: "",
  jsonContent: "",
  language: "",
  urlN8N: "",
  typebotSlug: "",
  typebotExpires: "1",
  typebotDelayMessage: "1000",
  typebotKeywordFinish: "",
  typebotKeywordRestart: "",
  typebotUnknownMessage: "",
  typebotRestartMessage: ""
};

type Loaded = Partial<Record<keyof Values, string | number | null>>;
const text = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value));

// Porta de frontend/src/components/QueueIntegrationModal. Sem o botão "Testar
// Bot": a rota que ele chamava não existe no backend.
export default function QueueIntegrationModal({
  open,
  onClose,
  integrationId
}: {
  open: boolean;
  onClose: () => void;
  integrationId?: number | null;
}) {
  const { t } = useTranslation();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(makeSchema(t)), defaultValues: emptyValues });
  const type = useWatch({ control, name: "type" });
  const [formKey, setFormKey] = useState(0);
  const loadValues = useCallback(
    (values: Values) => {
      reset(values);
      setFormKey(key => key + 1);
    },
    [reset]
  );

  useEffect(() => {
    if (!open) return undefined;
    if (!integrationId) {
      reset(emptyValues);
      return undefined;
    }
    let active = true;
    api
      .get<Loaded>(`/queueIntegration/${integrationId}`)
      .then(({ data }) => {
        if (!active) return;
        const loadedType = TYPES.includes(data.type as (typeof TYPES)[number]) ? (data.type as Values["type"]) : "typebot";
        loadValues({
          ...emptyValues,
          ...Object.fromEntries(Object.keys(emptyValues).map(key => [key, text(data[key as keyof Values])])),
          type: loadedType
        } as Values);
      })
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open, integrationId, reset, loadValues]);

  const onSubmit = async (values: Values) => {
    const payload = {
      ...values,
      projectName: values.type === "dialogflow" ? values.projectName : values.name,
      typebotExpires: Number(values.typebotExpires || 0),
      typebotDelayMessage: Number(values.typebotDelayMessage || 0)
    };
    try {
      if (integrationId) {
        await api.put(`/queueIntegration/${integrationId}`, payload);
        toast.success(t("queueIntegrationModal.messages.editSuccess"));
      } else {
        await api.post("/queueIntegration", payload);
        toast.success(t("queueIntegrationModal.messages.addSuccess"));
      }
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const field = (name: keyof Values, label: string, md = 6, extra: Record<string, unknown> = {}) => (
    <Grid size={{ xs: 12, md }}>
      <TextField
        {...register(name)}
        label={label}
        error={!!errors[name]}
        helperText={errors[name]?.message}
        variant="outlined"
        margin="dense"
        fullWidth
        {...extra}
      />
    </Grid>
  );
  const numeric = { slotProps: { htmlInput: { inputMode: "numeric" } } };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle>{integrationId ? t("queueIntegrationModal.title.edit") : t("queueIntegrationModal.title.add")}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers key={formKey}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl variant="outlined" margin="dense" fullWidth>
                <InputLabel id="integration-type-label">{t("queueIntegrationModal.form.type")}</InputLabel>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: typeField }) => (
                    <Select {...typeField} labelId="integration-type-label" label={t("queueIntegrationModal.form.type")}>
                      <MenuItem value="dialogflow">DialogFlow</MenuItem>
                      <MenuItem value="n8n">N8N</MenuItem>
                      <MenuItem value="webhook">WebHooks</MenuItem>
                      <MenuItem value="typebot">Typebot</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>
            {field("name", t("queueIntegrationModal.form.name"))}
            {type === "dialogflow" && (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl variant="outlined" margin="dense" fullWidth>
                    <InputLabel id="integration-language-label">{t("queueIntegrationModal.form.language")}</InputLabel>
                    <Controller
                      control={control}
                      name="language"
                      render={({ field: languageField }) => (
                        <Select {...languageField} labelId="integration-language-label" label={t("queueIntegrationModal.form.language")}>
                          <MenuItem value="pt-BR">Portugues</MenuItem>
                          <MenuItem value="en">Inglês</MenuItem>
                          <MenuItem value="es">Español</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                {field("projectName", t("queueIntegrationModal.form.projectName"))}
                {field("jsonContent", t("queueIntegrationModal.form.jsonContent"), 12, { multiline: true, rows: 5 })}
              </>
            )}
            {URL_TYPES.includes(type) && field("urlN8N", t("queueIntegrationModal.form.urlN8N"), 12, { placeholder: "https://" })}
            {type === "typebot" && (
              <>
                {field("typebotSlug", t("queueIntegrationModal.form.typebotSlug"))}
                {field("typebotExpires", t("queueIntegrationModal.form.typebotExpires"), 6, numeric)}
                {field("typebotDelayMessage", t("queueIntegrationModal.form.typebotDelayMessage"), 6, numeric)}
                {field("typebotKeywordFinish", t("queueIntegrationModal.form.typebotKeywordFinish"))}
                {field("typebotKeywordRestart", t("queueIntegrationModal.form.typebotKeywordRestart"))}
                {field("typebotUnknownMessage", t("queueIntegrationModal.form.typebotUnknownMessage"))}
                {field("typebotRestartMessage", t("queueIntegrationModal.form.typebotRestartMessage"), 12)}
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary" disabled={isSubmitting} variant="outlined">
            {t("queueIntegrationModal.buttons.cancel")}
          </Button>
          <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
            {integrationId ? t("queueIntegrationModal.buttons.okEdit") : t("queueIntegrationModal.buttons.okAdd")}
            {isSubmitting && (
              <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
