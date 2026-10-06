"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Box, Button, Paper } from "@mui/material";
import Ticket from "@/components/ticket/Ticket";
import logo from "@/assets/logo.png";

// Área da direita: a conversa do ticket aberto ou o logo.
export default function TicketPanel({ uuid, onSelectTicket }: { uuid: string | null; onSelectTicket?: () => void }) {
  const { t } = useTranslation();

  if (uuid) return <Ticket key={uuid} uuid={uuid} />;

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
        {onSelectTicket && (
          <Box sx={{ mt: 2 }}>
            <Button onClick={onSelectTicket} variant="contained" color="primary">
              {t("ticketAdvanced.selectTicket")}
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
