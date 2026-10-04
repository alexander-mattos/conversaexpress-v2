"use client";

import { use } from "react";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

const LEGACY_URL = (process.env.NEXT_PUBLIC_LEGACY_URL || "").replace(/\/$/, "");

// Telas que ainda não foram migradas: aponta para a mesma tela no frontend atual.
export default function NotMigratedPage({ params }: { params: Promise<{ legacy: string[] }> }) {
  const { legacy } = use(params);
  const path = `/${legacy.map(encodeURIComponent).join("/")}`;

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, textAlign: "center" }} elevation={2}>
        <Typography component="h1" variant="h6" color="primary" gutterBottom>
          Tela em migração
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          A tela <b>{path}</b> ainda não foi migrada para o novo frontend.
          {LEGACY_URL ? " Enquanto isso, use-a no frontend atual." : ""}
        </Typography>
        {LEGACY_URL && (
          <Box>
            <Button
              variant="contained"
              color="primary"
              href={`${LEGACY_URL}${path}`}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon />}
            >
              Abrir no frontend atual
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
