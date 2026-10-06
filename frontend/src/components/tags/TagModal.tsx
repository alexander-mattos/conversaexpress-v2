"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField
} from "@mui/material";
import { green } from "@mui/material/colors";
import ColorizeIcon from "@mui/icons-material/Colorize";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

export const DEFAULT_TAG_COLOR = "#A4CCCC";

const schema = z.object({
  name: z.string().trim().min(3, "Mensagem muito curta"),
  color: z.string(),
  kanban: z.boolean()
});
type Values = z.infer<typeof schema>;

const emptyValues: Values = { name: "", color: "", kanban: false };

// O seletor nativo só aceita #rrggbb.
const toPickerValue = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_TAG_COLOR);

// Porta de frontend/src/components/TagModal. O seletor de cor do
// material-ui-color deu lugar ao seletor nativo do navegador.
export default function TagModal({
  open,
  onClose,
  tagId,
  reload
}: {
  open: boolean;
  onClose: () => void;
  tagId?: number | null;
  reload?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const pickerRef = useRef<HTMLInputElement>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: emptyValues });
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
  // inputRef: o campo de texto (e não a amostra de cor dentro dele) é o da cor.
  const colorField = register("color");

  useEffect(() => {
    if (!open || !tagId) return;
    api
      .get<{ name: string; color: string; kanban: number }>(`/tags/${tagId}`)
      .then(({ data }) => loadValues({ name: data.name ?? "", color: data.color ?? "", kanban: data.kanban === 1 }))
      .catch(toastError);
  }, [open, tagId, reset, loadValues]);

  if (!user) return null;
  const canKanban = user.profile === "admin" || user.profile === "supervisor";

  const handleClose = () => {
    reset(emptyValues);
    onClose();
  };

  const onSubmit = async (values: Values) => {
    const tagData = {
      name: values.name.trim(),
      color: values.color.trim() || DEFAULT_TAG_COLOR,
      kanban: values.kanban ? 1 : 0,
      userId: user.id
    };
    try {
      if (tagId) {
        await api.put(`/tags/${tagId}`, tagData);
      } else {
        await api.post("/tags", tagData);
      }
      toast.success(t("tagModal.success"));
      reload?.();
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth scroll="paper">
      <DialogTitle>{tagId ? t("tagModal.title.edit") : t("tagModal.title.add")}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers key={formKey}>
          <TextField
            {...register("name")}
            label={t("tagModal.form.name")}
            error={!!errors.name}
            helperText={errors.name?.message}
            variant="outlined"
            margin="dense"
            fullWidth
            autoFocus
          />
          <br />
          <TextField
            name={colorField.name}
            onChange={colorField.onChange}
            onBlur={colorField.onBlur}
            inputRef={colorField.ref}
            label={t("tagModal.form.color")}
            variant="outlined"
            margin="dense"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    {/* Amostra da cor; clicar abre o seletor nativo (vazia = cor padrão). */}
                    <Box
                      component="input"
                      type="color"
                      ref={pickerRef}
                      aria-label={t("tagModal.form.color")}
                      data-testid="tag-color-picker"
                      value={toPickerValue(color)}
                      onChange={e => setValue("color", (e.target as HTMLInputElement).value.toUpperCase())}
                      sx={{
                        width: 20,
                        height: 20,
                        p: 0,
                        border: 0,
                        cursor: "pointer",
                        background: "none",
                        "&::-webkit-color-swatch-wrapper": { p: 0 },
                        "&::-webkit-color-swatch": { border: "none" },
                        "&::-moz-color-swatch": { border: "none" }
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <IconButton size="small" aria-label="pick color" onClick={() => pickerRef.current?.click()}>
                    <ColorizeIcon />
                  </IconButton>
                )
              }
            }}
          />
          {canKanban && (
            <Box>
              <Controller
                control={control}
                name="kanban"
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox checked={field.value} onChange={e => field.onChange(e.target.checked)} color="primary" />
                    }
                    label="Kanban"
                    labelPlacement="start"
                  />
                )}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary" disabled={isSubmitting} variant="outlined">
            {t("tagModal.buttons.cancel")}
          </Button>
          <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
            {tagId ? t("tagModal.buttons.okEdit") : t("tagModal.buttons.okAdd")}
            {isSubmitting && (
              <CircularProgress
                size={24}
                sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }}
              />
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
