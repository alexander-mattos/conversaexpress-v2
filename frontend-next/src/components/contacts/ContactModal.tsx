"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
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
  IconButton,
  TextField,
  Typography
} from "@mui/material";
import { green } from "@mui/material/colors";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

export interface ContactFormValues {
  name: string;
  number: string;
  email: string;
  extraInfo: { id?: number; name: string; value: string }[];
}

export interface SavedContact extends ContactFormValues {
  id: number;
  whatsapp?: { name: string } | null;
}

const EMPTY: ContactFormValues = { name: "", number: "", email: "", extraInfo: [] };

// Porta de frontend/src/components/ContactModal (mesmos campos, textos e regras).
export default function ContactModal({
  open,
  onClose,
  contactId,
  initialValues,
  onSave
}: {
  open: boolean;
  onClose: () => void;
  contactId?: number | null;
  initialValues?: Partial<ContactFormValues>;
  onSave?: (contact: SavedContact) => void;
}) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, t("contactModal.formErrors.name.required"))
          .min(2, t("contactModal.formErrors.name.short"))
          .max(50, t("contactModal.formErrors.name.long")),
        number: z
          .string()
          .refine(v => v === "" || v.length >= 8, t("contactModal.formErrors.phone.short"))
          .refine(v => v.length <= 50, t("contactModal.formErrors.phone.long")),
        email: z.union([z.literal(""), z.string().email(t("contactModal.formErrors.email.invalid"))]),
        extraInfo: z.array(z.object({ id: z.number().optional(), name: z.string(), value: z.string() }))
      }),
    [t]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ContactFormValues & { whatsapp?: { name: string } | null }>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY
  });
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
  const { fields, append, remove } = useFieldArray({ control, name: "extraInfo" });
  const whatsapp = useWatch({ control, name: "whatsapp" });

  useEffect(() => {
    if (!open) return;
    reset({ ...EMPTY, ...initialValues });
    if (!contactId) return;
    api
      .get<SavedContact>(`/contacts/${contactId}`)
      .then(({ data }) =>
        loadValues({
          name: data.name ?? "",
          number: data.number ?? "",
          email: data.email ?? "",
          extraInfo: data.extraInfo ?? [],
          whatsapp: data.whatsapp
        })
      )
      .catch(toastError);
  }, [open, contactId, initialValues, reset, loadValues]);

  const handleClose = () => {
    onClose();
    reset(EMPTY);
  };

  const onSubmit = async ({ name, number, email, extraInfo }: ContactFormValues) => {
    const values = { name, number, email, extraInfo };
    try {
      if (contactId) {
        await api.put(`/contacts/${contactId}`, values);
      } else {
        const { data } = await api.post<SavedContact>("/contacts", values);
        onSave?.(data);
      }
      handleClose();
      toast.success(t("contactModal.success"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" scroll="paper">
      <DialogTitle>{contactId ? t("contactModal.title.edit") : t("contactModal.title.add")}</DialogTitle>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers key={formKey}>
          <Typography variant="subtitle1" gutterBottom>
            {t("contactModal.form.mainInfo")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            <TextField
              label={t("contactModal.form.name")}
              autoFocus
              error={!!errors.name}
              helperText={errors.name?.message}
              variant="outlined"
              margin="dense"
              sx={{ mr: 1, flex: 1 }}
              {...register("name")}
            />
            <TextField
              label={t("contactModal.form.number")}
              error={!!errors.number}
              helperText={errors.number?.message}
              variant="outlined"
              margin="dense"
              {...register("number")}
            />
          </Box>
          <TextField
            label={t("contactModal.form.email")}
            error={!!errors.email}
            helperText={errors.email?.message}
            placeholder="Email address"
            fullWidth
            margin="dense"
            variant="outlined"
            {...register("email")}
          />
          <Typography variant="subtitle1" sx={{ mb: 1, mt: 1.5 }}>
            {t("contactModal.form.whatsapp")} {whatsapp ? whatsapp.name : ""}
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 1, mt: 1.5 }}>
            {t("contactModal.form.extraInfo")}
          </Typography>
          {fields.map((field, index) => (
            <Box key={field.id} sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <TextField
                label={t("contactModal.form.extraName")}
                variant="outlined"
                margin="dense"
                sx={{ mr: 1, flex: 1 }}
                {...register(`extraInfo.${index}.name`)}
              />
              <TextField
                label={t("contactModal.form.extraValue")}
                variant="outlined"
                margin="dense"
                sx={{ mr: 1, flex: 1 }}
                {...register(`extraInfo.${index}.value`)}
              />
              <IconButton size="small" onClick={() => remove(index)}>
                <DeleteOutlineIcon />
              </IconButton>
            </Box>
          ))}
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Button sx={{ flex: 1, mt: 1 }} variant="outlined" color="primary" onClick={() => append({ name: "", value: "" })}>
              {`+ ${t("contactModal.buttons.addExtraInfo")}`}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary" disabled={isSubmitting} variant="outlined">
            {t("contactModal.buttons.cancel")}
          </Button>
          <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
            {contactId ? t("contactModal.buttons.okEdit") : t("contactModal.buttons.okAdd")}
            {isSubmitting && (
              <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
