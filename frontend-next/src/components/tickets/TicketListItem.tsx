"use client";

import { useState, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { format, isSameDay, parseISO } from "date-fns";
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography
} from "@mui/material";
import { green, grey } from "@mui/material/colors";
import AndroidIcon from "@mui/icons-material/Android";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { greetingEnabled, greetingMessage } from "@/lib/tickets/rules";
import type { Ticket } from "@/lib/tickets/types";
import ContactTag from "./ContactTag";

const tagSx = {
  color: "#FFF",
  mr: "1px",
  p: "1px 5px",
  fontWeight: "bold",
  borderRadius: "3px",
  fontSize: "0.8em",
  whiteSpace: "nowrap"
} as const;

const actionButtonSx = {
  position: "absolute",
  color: "white",
  p: 0,
  minWidth: 64,
  borderRadius: 0,
  left: "8px",
  fontSize: "0.6rem",
  "&:hover": { opacity: 0.9 }
} as const;

// uuid do ticket aberto em /tickets/<uuid>.
export const useOpenTicketUuid = (): string | null => {
  const pathname = usePathname();
  const [, base, uuid] = pathname.split("/");
  return base === "tickets" && uuid ? uuid : null;
};

// Porta de frontend/src/components/TicketListItemCustom.
export default function TicketListItem({ ticket, onSelect }: { ticket: Ticket; onSelect?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const openUuid = useOpenTicketUuid();
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const run = async (action: () => Promise<void>, goTo: string) => {
    setLoading(true);
    try {
      await action();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
    router.push(goTo);
  };

  const handleAccept = (event: MouseEvent) => {
    event.stopPropagation();
    run(async () => {
      await api.put(`/tickets/${ticket.id}`, { status: "open", userId: user.id });
      let settings: { key: string; value: string }[] = [];
      try {
        settings = (await api.get("/settings/")).data;
      } catch (err) {
        toastError(err);
      }
      if (greetingEnabled(settings) && !ticket.isGroup) {
        try {
          await api.post(`/messages/${ticket.id}`, {
            read: 1,
            fromMe: true,
            mediaUrl: "",
            body: greetingMessage(user.name)
          });
        } catch (err) {
          toastError(err);
        }
      }
    }, `/tickets/${ticket.uuid}`);
  };

  const handleClose = (event: MouseEvent) => {
    event.stopPropagation();
    run(async () => {
      await api.put(`/tickets/${ticket.id}`, {
        status: "closed",
        userId: user.id,
        queueId: ticket.queue?.id,
        useIntegration: false,
        promptId: null,
        integrationId: null
      });
    }, "/tickets/");
  };

  const handleReopen = (event: MouseEvent) => {
    event.stopPropagation();
    run(async () => {
      await api.put(`/tickets/${ticket.id}`, { status: "open", userId: user.id, queueId: ticket.queue?.id });
    }, `/tickets/${ticket.uuid}`);
  };

  const handleSelect = () => {
    // Pendentes só abrem depois de aceitos, como hoje.
    if (ticket.status === "pending") return;
    onSelect?.();
    router.push(`/tickets/${ticket.uuid}`);
  };

  const pending = ticket.status === "pending";
  const updatedAt = parseISO(ticket.updatedAt);
  const ticketUser = ticket.userId && ticket.user ? ticket.user.name?.toUpperCase() : null;
  const queueName = ticket.queue?.name?.toUpperCase() || t("ticketsListItem.noQueue");
  const queueColor = ticket.queue?.color || "#7C7C7C";
  const lastMessage = ticket.lastMessage || "";

  const actionButton = (label: string, color: string, bottom: string, onClick: (e: MouseEvent) => void) => (
    <Button
      variant="contained"
      size="small"
      disabled={loading}
      onClick={onClick}
      sx={{ ...actionButtonSx, bottom, backgroundColor: color, "&:hover": { backgroundColor: color } }}
    >
      {label}
      {loading && (
        <CircularProgress size={16} sx={{ position: "absolute", top: "50%", left: "50%", mt: "-8px", ml: "-8px" }} />
      )}
    </Button>
  );

  return (
    <>
      <ListItemButton
        dense
        onClick={handleSelect}
        selected={openUuid === ticket.uuid}
        sx={{ position: "relative", ...(pending && { cursor: "unset" }) }}
      >
        <Tooltip arrow placement="right" title={queueName}>
          <Box
            component="span"
            sx={{ flex: "none", width: "8px", height: "100%", position: "absolute", top: 0, left: 0, backgroundColor: queueColor }}
          />
        </Tooltip>
        <ListItemAvatar>
          <Avatar
            src={ticket.contact?.profilePicUrl}
            sx={
              pending
                ? { mt: "-30px", ml: 0, width: 50, height: 50, borderRadius: "10%" }
                : { mt: "-20px", ml: "-3px", width: 55, height: 55, borderRadius: "10%" }
            }
          />
        </ListItemAvatar>
        <ListItemText
          disableTypography
          primary={
            <Box component="span" sx={{ display: "flex", justifyContent: "space-between", ml: "5px" }}>
              <Typography noWrap component="span" variant="body2" color="textPrimary">
                {ticket.contact?.name}
              </Typography>
              {ticket.chatbot && (
                <Box sx={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
                  <Box sx={{ position: "relative", top: 13 }}>
                    <Tooltip title={t("ticketsListItem.tooltip.chatbot")}>
                      <AndroidIcon fontSize="small" sx={{ color: grey[700], mr: "5px" }} />
                    </Tooltip>
                  </Box>
                </Box>
              )}
            </Box>
          }
          secondary={
            <Box component="span" sx={{ display: "flex", justifyContent: "space-between", ml: "5px" }}>
              <Typography noWrap component="span" variant="body2" color="textSecondary" sx={{ pr: 0, ml: "5px" }}>
                {" "}
                <MarkdownWrapper>{lastMessage.includes("data:image/png;base64") ? " Localização" : lastMessage}</MarkdownWrapper>
                <Box component="span" sx={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", alignContent: "flex-start" }}>
                  {ticket.whatsapp?.name ? (
                    <Box component="span" sx={{ ...tagSx, background: "green" }}>
                      {ticket.whatsapp.name.toUpperCase()}
                    </Box>
                  ) : (
                    <br />
                  )}
                  {ticketUser ? (
                    <Box component="span" sx={{ ...tagSx, backgroundColor: "#000000" }}>
                      {ticketUser}
                    </Box>
                  ) : (
                    <br />
                  )}
                  <Box component="span" sx={{ ...tagSx, backgroundColor: queueColor }}>
                    {queueName}
                  </Box>
                </Box>
                <Box component="span" sx={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", pt: "2px" }}>
                  {ticket.tags?.map(tag => <ContactTag tag={tag} key={`ticket-contact-tag-${ticket.id}-${tag.id}`} />)}
                </Box>
              </Typography>
              <Badge
                badgeContent={ticket.unreadMessages}
                sx={{
                  position: "absolute",
                  alignSelf: "center",
                  mr: 1,
                  ml: "auto",
                  top: "10px",
                  left: "20px",
                  "& .MuiBadge-badge": { color: "white", backgroundColor: green[500] }
                }}
              />
            </Box>
          }
        />
        {lastMessage && (
          <Box sx={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
            <Typography component="span" variant="body2" color="textSecondary" sx={{ textAlign: "right", position: "relative", top: -21 }}>
              {isSameDay(updatedAt, new Date()) ? format(updatedAt, "HH:mm") : format(updatedAt, "dd/MM/yyyy")}
            </Typography>
          </Box>
        )}
        {pending && actionButton(t("ticketsList.buttons.accept"), "green", "17px", handleAccept)}
        {ticket.status !== "closed" && actionButton(t("ticketsList.buttons.closed"), "red", "0px", handleClose)}
        {ticket.status === "closed" && actionButton(t("ticketsList.buttons.reopen"), "red", "0px", handleReopen)}
      </ListItemButton>
      <Divider variant="inset" component="li" />
    </>
  );
}
