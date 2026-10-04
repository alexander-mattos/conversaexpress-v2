"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Box, Button, Paper, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import logo from "@/assets/logo.png";

const LEGACY_URL = (process.env.NEXT_PUBLIC_LEGACY_URL || "").replace(/\/$/, "");

// Área da conversa. A conversa em si chega na etapa 3b-2; até lá, o ticket
// selecionado abre no frontend atual.
export default function TicketPanel({ uuid, onSelectTicket }: { uuid: string | null; onSelectTicket?: () => void }) {
  const { t } = useTranslation();
  return (
    <Paper
      square
      variant="outlined"
      sx={{
        bgcolor: "boxticket",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-evenly",
        alignItems: "center",
        height: "100%",
        textAlign: "center"
      }}
    >
      <Box sx={{ width: "100%" }}>
        <Image src={logo} alt="logologin" style={{ margin: "0 auto", width: "70%", height: "auto" }} priority />
        {!uuid && onSelectTicket && (
          <Box sx={{ mt: 2 }}>
            <Button onClick={onSelectTicket} variant="contained" color="primary">
              {t("ticketAdvanced.selectTicket")}
            </Button>
          </Box>
        )}
        {uuid && (
          <Box sx={{ mt: 3, px: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              A conversa ainda está em migração para o novo frontend.
            </Typography>
            {LEGACY_URL && (
              <Button
                variant="contained"
                color="primary"
                href={`${LEGACY_URL}/tickets/${encodeURIComponent(uuid)}`}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon />}
              >
                Abrir no frontend atual
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
