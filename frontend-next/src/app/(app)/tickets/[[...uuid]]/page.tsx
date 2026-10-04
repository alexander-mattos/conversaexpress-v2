"use client";

import { use, useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation, BottomNavigationAction, Box, Grid, Paper, useMediaQuery, useTheme } from "@mui/material";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import ChatIcon from "@mui/icons-material/Chat";
import TicketPanel from "@/components/tickets/TicketPanel";
import TicketsManagerTabs from "@/components/tickets/TicketsManagerTabs";

const TICKET = 0;
const LIST = 1;

// /tickets e /tickets/<uuid>. Como hoje: a partir de "md" lista e conversa
// lado a lado (TicketsCustom); abaixo, navegação inferior (TicketsAdvanced).
export default function TicketsPage({ params }: { params: Promise<{ uuid?: string[] }> }) {
  const { uuid: segments } = use(params);
  const uuid = segments?.[0] ?? null;
  const { t } = useTranslation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const [option, setOption] = useState(uuid ? TICKET : LIST);
  const [lastUuid, setLastUuid] = useState(uuid);

  // Ao abrir outro ticket, o celular volta para a aba da conversa.
  if (uuid !== lastUuid) {
    setLastUuid(uuid);
    if (uuid) setOption(TICKET);
  }

  if (desktop) {
    return (
      <Box sx={{ flex: 1, p: 1, height: "calc(100% - 48px)", overflowY: "hidden" }}>
        <Box sx={{ display: "flex", height: "100%" }}>
          <Grid container spacing={0} sx={{ width: "100%" }}>
            <Grid size={4} sx={{ display: "flex", height: "100%", flexDirection: "column", overflowY: "hidden" }}>
              <TicketsManagerTabs />
            </Grid>
            <Grid size={8} sx={{ display: "flex", height: "100%", flexDirection: "column" }}>
              <TicketPanel uuid={uuid} />
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }

  return (
    <Paper sx={{ height: "calc(100% - 48px)", display: "grid", gridTemplateRows: "56px 1fr" }}>
      <Box>
        <BottomNavigation value={option} onChange={(_, value: number) => setOption(value)} showLabels>
          <BottomNavigationAction label={t("ticketAdvanced.ticketNav")} icon={<ChatIcon />} />
          <BottomNavigationAction label={t("ticketAdvanced.attendanceNav")} icon={<QuestionAnswerIcon />} />
        </BottomNavigation>
      </Box>
      <Box sx={{ overflow: "auto" }}>
        {option === TICKET ? (
          <TicketPanel uuid={uuid} onSelectTicket={() => setOption(LIST)} />
        ) : (
          <TicketsManagerTabs onSelect={() => setOption(TICKET)} />
        )}
      </Box>
    </Paper>
  );
}
