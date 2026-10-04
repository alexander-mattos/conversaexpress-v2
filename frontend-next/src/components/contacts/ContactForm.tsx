"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { Box, Button, CircularProgress, Grid, TextField } from "@mui/material";
import { green } from "@mui/material/colors";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

const schema = z.object({
  name: z.string().min(1, "Required").min(2, "Too Short!").max(50, "Too Long!"),
  number: z
    .string()
    .refine(v => v === "" || v.length >= 8, "Too Short!")
    .refine(v => v.length <= 50, "Too Long!"),
  email: z.union([z.literal(""), z.string().email("Invalid email")])
});

type Values = z.infer<typeof schema>;

// Edição rápida no painel do contato (porta de frontend/src/components/ContactForm).
export default function ContactForm({
  initialContact,
  onCancel
}: {
  initialContact: { id: number; name: string; number?: string; email?: string };
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    reset({ name: initialContact.name ?? "", number: initialContact.number ?? "", email: initialContact.email ?? "" });
  }, [initialContact, reset]);

  const onSubmit = async (values: Values) => {
    try {
      await api.put(`/contacts/${initialContact.id}`, values);
      toast.success(t("contactModal.success"));
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={1}>
        <Grid size={12}>
          <TextField
            label={t("contactModal.form.name")}
            autoFocus
            error={!!errors.name}
            helperText={errors.name?.message}
            variant="outlined"
            margin="dense"
            fullWidth
            {...register("name")}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label={t("contactModal.form.number")}
            error={!!errors.number}
            helperText={errors.number?.message}
            placeholder="5513912344321"
            variant="outlined"
            margin="dense"
            fullWidth
            {...register("number")}
          />
        </Grid>
        <Grid size={12}>
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
        </Grid>
        <Grid size={12}>
          <Grid container spacing={1}>
            <Grid size={6}>
              <Button onClick={onCancel} color="secondary" disabled={isSubmitting} variant="outlined" fullWidth>
                {t("contactModal.buttons.cancel")}
              </Button>
            </Grid>
            <Grid size={6}>
              <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" fullWidth sx={{ position: "relative" }}>
                {t("contactModal.buttons.okEdit")}
                {isSubmitting && (
                  <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
                )}
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
