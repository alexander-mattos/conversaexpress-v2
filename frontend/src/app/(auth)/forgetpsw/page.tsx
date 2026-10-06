"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { Box, Button, Container, IconButton, InputAdornment, Link as MuiLink, TextField, Typography } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTranslation } from "react-i18next";
import { openApi } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import logo from "@/assets/logo.png";

// Mesma regra da tela atual: 8+ caracteres com maiúscula, minúscula e número.
const PASSWORD_REGEX = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

export default function ForgetPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [codeSent, setCodeSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          email: z
            .string()
            .min(1, t("resetPassword.formErrors.email.required"))
            .email(t("resetPassword.formErrors.email.invalid")),
          token: z.string(),
          newPassword: z.string(),
          confirmPassword: z.string()
        })
        .superRefine((values, ctx) => {
          if (!codeSent) return;
          if (!values.newPassword) {
            ctx.addIssue({ code: "custom", path: ["newPassword"], message: t("resetPassword.formErrors.newPassword.required") });
          } else if (!PASSWORD_REGEX.test(values.newPassword)) {
            ctx.addIssue({ code: "custom", path: ["newPassword"], message: t("resetPassword.formErrors.newPassword.matches") });
          }
          if (!values.confirmPassword) {
            ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: t("resetPassword.formErrors.confirmPassword.required") });
          } else if (values.confirmPassword !== values.newPassword) {
            ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: t("resetPassword.formErrors.confirmPassword.matches") });
          }
        }),
    [codeSent, t]
  );
  type ResetForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", token: "", newPassword: "", confirmPassword: "" }
  });

  const onSubmit = async (values: ResetForm) => {
    try {
      if (!codeSent) {
        await openApi.post("/forgetpassword", { email: values.email });
        toast.success(t("resetPassword.toasts.emailSent"));
        setCodeSent(true);
        return;
      }
      await openApi.post("/resetpasswords", {
        email: values.email,
        token: values.token,
        password: values.newPassword
      });
      toast.success(t("resetPassword.toasts.passwordUpdated"));
      router.push("/login");
    } catch (err) {
      toastError(err);
    }
  };

  const passwordAdornment = (visible: boolean, toggle: () => void) => (
    <InputAdornment position="end">
      <IconButton onClick={toggle} edge="end">
        {visible ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        background: "black",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
      }}
    >
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            bgcolor: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: "55px 30px",
            borderRadius: "12.5px"
          }}
        >
          <Image src={logo} alt="ConversaExpress" style={{ margin: "0 auto", height: "80px", width: "100%", objectFit: "contain" }} priority />
          <Typography component="h1" variant="h5" sx={{ color: "black" }}>
            {t("resetPassword.title")}
          </Typography>
          <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ width: "100%", mt: 1 }}>
            <TextField
              margin="normal"
              fullWidth
              required
              id="email"
              label={t("resetPassword.form.email")}
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email")}
            />
            {codeSent && (
              <>
                <TextField
                  margin="normal"
                  fullWidth
                  required
                  id="token"
                  label={t("resetPassword.form.verificationCode")}
                  {...register("token")}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  required
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  label={t("resetPassword.form.newPassword")}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                  slotProps={{ input: { endAdornment: passwordAdornment(showPassword, () => setShowPassword(v => !v)) } }}
                  {...register("newPassword")}
                />
                <TextField
                  margin="normal"
                  fullWidth
                  required
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  label={t("resetPassword.form.confirmPassword")}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  slotProps={{ input: { endAdornment: passwordAdornment(showConfirm, () => setShowConfirm(v => !v)) } }}
                  {...register("confirmPassword")}
                />
              </>
            )}
            <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 3, mb: 2 }}>
              {codeSent ? t("resetPassword.buttons.submitPassword") : t("resetPassword.buttons.submitEmail")}
            </Button>
            <Box sx={{ textAlign: "right" }}>
              <MuiLink component={Link} href="/signup" variant="body2">
                {t("resetPassword.buttons.back")}
              </MuiLink>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
