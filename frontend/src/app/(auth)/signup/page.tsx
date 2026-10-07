"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  Container,
  Grid,
  InputLabel,
  Link as MuiLink,
  MenuItem,
  Select,
  TextField
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { openApi } from "@/lib/api";
import { maskPhone } from "@/lib/phoneMask";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/lib/billing/cpfCnpj";
import { toastError } from "@/lib/toastError";
import logo from "@/assets/logo.png";

interface Plan {
  id: number;
  name: string;
  users: number;
  connections: number;
  queues: number;
  value: number;
}

export default function SignupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);

  // Mesmas regras do cadastro atual (senha de 8 a 50 caracteres).
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t("signup.formErrors.name.short")).max(50, t("signup.formErrors.name.long")),
        email: z.string().min(1, t("signup.formErrors.email.required")).email(t("signup.formErrors.email.invalid")),
        phone: z.string().refine(v => v.replace(/\D/g, "").length >= 10, t("signup.formErrors.phone.invalid")),
        document: z.string().refine(isValidCpfCnpj, t("signup.formErrors.document.invalid")),
        password: z
          .string()
          .min(1, t("signup.formErrors.password.required"))
          .min(8, t("signup.formErrors.password.short"))
          .max(50, t("signup.formErrors.password.long")),
        planId: z.union([z.number(), z.literal("")])
      }),
    [t]
  );
  type SignupForm = z.infer<typeof schema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignupForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", document: "", password: "", planId: "" }
  });

  useEffect(() => {
    openApi
      .get<Plan[]>("/plans/list")
      .then(({ data }) => setPlans(data))
      .catch(toastError);
  }, []);

  const onSubmit = async (values: SignupForm) => {
    try {
      await openApi.post("/companies/cadastro", { ...values, document: onlyDigits(values.document) });
      toast.success(t("signup.toasts.success"));
      router.push("/login");
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ mt: 8, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Image src={logo} alt="ConversaExpress" style={{ margin: "0 auto", width: "70%", height: "auto" }} priority />
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ width: "100%", mt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                autoComplete="name"
                fullWidth
                id="name"
                label={t("signup.form.name")}
                error={!!errors.name}
                helperText={errors.name?.message}
                {...register("name")}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                required
                fullWidth
                id="email"
                autoComplete="email"
                label={t("signup.form.email")}
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register("email")}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    required
                    fullWidth
                    id="phone"
                    autoComplete="tel"
                    label={t("signup.form.phone")}
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    onChange={e => field.onChange(maskPhone(e.target.value))}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Controller
                name="document"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    required
                    fullWidth
                    id="document"
                    label={t("signup.form.document")}
                    error={!!errors.document}
                    helperText={errors.document?.message}
                    onChange={e => field.onChange(formatCpfCnpj(e.target.value))}
                    slotProps={{ htmlInput: { inputMode: "numeric" } }}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                required
                fullWidth
                id="password"
                type="password"
                autoComplete="new-password"
                label={t("signup.form.password")}
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register("password")}
              />
            </Grid>
            <Grid size={12}>
              <InputLabel htmlFor="plan-selection">Plano</InputLabel>
              <Controller
                name="planId"
                control={control}
                render={({ field }) => (
                  <Select {...field} fullWidth id="plan-selection" required>
                    {plans.map(plan => (
                      <MenuItem key={plan.id} value={plan.id}>
                        {plan.name} - {t("signup.plan.attendant")}: {plan.users} - {t("signup.plan.whatsapp")}:{" "}
                        {plan.connections} - {t("signup.plan.queues")}: {plan.queues} - R$ {plan.value}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
          </Grid>
          <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 3, mb: 2 }}>
            {t("signup.buttons.submit")}
          </Button>
          <Grid container sx={{ justifyContent: "flex-end" }}>
            <Grid>
              <MuiLink component={Link} href="/login" variant="body2">
                {t("signup.buttons.login")}
              </MuiLink>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
}
