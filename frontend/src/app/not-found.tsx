"use client";

import Link from "next/link";
import Image from "next/image";
import { Box, Button, Container, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";

// Endereço inexistente: mesma moldura do login, com a marca e um atalho para o início.
export default function NotFound() {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        bgcolor: "primary.main",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
      }}
    >
      <Container component="main" maxWidth="xs">
        <Box sx={{ bgcolor: "login", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, p: "55px 30px", borderRadius: "12.5px" }}>
          <Image src={logo} alt="ConversaExpress" style={{ margin: "0 auto", width: "70%", height: "auto" }} priority />
          <Typography component="h1" variant="h5" color="primary">
            {t("notFound.title")}
          </Typography>
          <Typography variant="body2">{t("notFound.message")}</Typography>
          <Button component={Link} href="/" variant="contained" color="primary">
            {t("notFound.back")}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
