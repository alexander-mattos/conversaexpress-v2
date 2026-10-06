"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, Button, CircularProgress, IconButton, Tooltip } from "@mui/material";
import { green } from "@mui/material/colors";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import type { Ticket } from "@/lib/tickets/types";
import TicketOptionsMenu from "./TicketOptionsMenu";

// Porta de frontend/src/components/TicketActionButtonsCustom.
export default function TicketActionButtons({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: "open" | "pending" | "closed", userId: number | null) => {
    setLoading(true);
    try {
      const closing = status === "closed";
      await api.put(`/tickets/${ticket.id}`, {
        status,
        userId: userId || null,
        useIntegration: closing ? false : ticket.useIntegration,
        promptId: closing ? false : ticket.promptId,
        integrationId: closing ? false : ticket.integrationId
      });
      setLoading(false);
      if (status === "open") router.push(`/tickets/${ticket.uuid}`);
      else router.push("/tickets");
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  const spinner = loading && (
    <CircularProgress size={24} sx={{ position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
  );

  return (
    <Box sx={{ mr: "6px", flex: "none", alignSelf: "center", ml: "auto", "& > *": { m: 0.5 } }}>
      {ticket.status === "closed" && (
        <Button disabled={loading} startIcon={<ReplayIcon />} size="small" onClick={() => updateStatus("open", user?.id ?? null)} sx={{ position: "relative" }}>
          {t("messagesList.header.buttons.reopen")}
          {spinner}
        </Button>
      )}
      {ticket.status === "open" && (
        <>
          <Tooltip title={t("messagesList.header.buttons.return")}>
            <IconButton onClick={() => updateStatus("pending", null)} aria-label={t("messagesList.header.buttons.return")}>
              <UndoRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("messagesList.header.buttons.resolve")}>
            <IconButton
              onClick={() => updateStatus("closed", user?.id ?? null)}
              aria-label={t("messagesList.header.buttons.resolve")}
              sx={{ color: green[500] }}
            >
              <CheckCircleIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)} aria-label="ticket options">
            <MoreVertIcon />
          </IconButton>
          <TicketOptionsMenu ticket={ticket} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} />
        </>
      )}
      {ticket.status === "pending" && (
        <Button
          disabled={loading}
          size="small"
          variant="contained"
          color="primary"
          onClick={() => updateStatus("open", user?.id ?? null)}
          sx={{ position: "relative" }}
        >
          {t("messagesList.header.buttons.accept")}
          {spinner}
        </Button>
      )}
    </Box>
  );
}
