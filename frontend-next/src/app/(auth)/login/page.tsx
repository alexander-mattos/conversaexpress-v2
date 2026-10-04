"use client";

import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { Box, Button, Container, Link as MuiLink, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import LanguageMenu from "@/components/LanguageMenu";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import pkg from "../../../../package.json";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { handleLogin } = useAuth();
  const { register, handleSubmit } = useForm<LoginForm>({ defaultValues: { email: "", password: "" } });

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "primary.main",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative"
      }}
    >
      <Box sx={{ position: "absolute", top: 0, left: 0, pl: "15px" }}>
        <LanguageMenu />
      </Box>
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            bgcolor: "login",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: "55px 30px",
            borderRadius: "12.5px"
          }}
        >
          <Image src={logo} alt="ConversaExpress" style={{ margin: "0 auto", width: "70%", height: "auto" }} priority />
          <Box component="form" noValidate onSubmit={handleSubmit(handleLogin)} sx={{ width: "100%", mt: 1 }}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="email"
              label={t("login.form.email")}
              autoComplete="email"
              autoFocus
              {...register("email")}
            />
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="password"
              type="password"
              label={t("login.form.password")}
              autoComplete="current-password"
              {...register("password")}
            />
            <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 3, mb: 2 }}>
              {t("login.buttons.submit")}
            </Button>
            <Box sx={{ textAlign: "left" }}>
              <MuiLink component={Link} href="/signup" variant="body2">
                {t("login.buttons.register")}
              </MuiLink>
            </Box>
          </Box>
        </Box>
        <Box sx={{ mt: 8 }}>
          <Typography variant="body2" color="primary" align="center">
            {"Copyright "}
            <MuiLink color="primary" href="#">
              ConversaExpress - v {pkg.version}
            </MuiLink>{" "}
            {new Date().getFullYear()}.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
