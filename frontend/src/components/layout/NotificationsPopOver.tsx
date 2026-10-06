"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Badge, IconButton, List, ListItem, ListItemText, Popover } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import TicketListItem, { useOpenTicketUuid } from "@/components/tickets/TicketListItem";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { isNotifiableMessage, shouldAlert, showsPendingNotifications } from "@/lib/tickets/rules";
import type { AppMessageEvent, Ticket, TicketEvent } from "@/lib/tickets/types";

const ALERT_SOUND = "/sounds/sound.mp3";

const upsertFirst = (list: Ticket[], ticket: Ticket): Ticket[] =>
  list.some(t => t.id === ticket.id) ? list.map(t => (t.id === ticket.id ? ticket : t)) : [ticket, ...list];

// Porta de frontend/src/components/NotificationsPopOver: tickets com
// mensagens não lidas, som e notificação do navegador.
export default function NotificationsPopOver({ volume }: { volume: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const openUuid = useOpenTicketUuid();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const desktopNotifications = useRef<Notification[]>([]);
  // Valores atuais para os handlers do socket, sem refazer a inscrição.
  const live = useRef({ openUuid, volume, push: router.push });
  useEffect(() => {
    live.current = { openUuid, volume, push: router.push };
  }, [openUuid, volume, router.push]);

  const companyId = user?.companyId;
  const userId = user?.id;
  const profile = user?.profile;
  const allTicket = user?.allTicket;
  const queues = user?.queues;

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  // Lista inicial: tickets com mensagens não lidas.
  useEffect(() => {
    if (!userId || !profile || !queues) return undefined;
    let active = true;
    const viewer = { id: userId, profile, allTicket, queues };
    api
      .get<{ tickets: Ticket[] }>("/tickets", { params: { withUnreadMessages: "true" } })
      .then(({ data }) => {
        if (!active) return;
        setNotifications(
          showsPendingNotifications(viewer) ? data.tickets : data.tickets.filter(ticket => ticket.status !== "pending")
        );
      })
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [userId, profile, allTicket, queues]);

  useEffect(() => {
    if (!companyId || !userId || !profile || !queues) return undefined;
    const viewer = { id: userId, profile, allTicket, queues };
    const socket = socketManager.getSocket(companyId, userId);

    const closeDesktopNotification = (ticketId: number) => {
      desktopNotifications.current = desktopNotifications.current.filter(n => {
        if (n.tag !== String(ticketId)) return true;
        n.close();
        return false;
      });
    };

    const notify = ({ message, contact, ticket }: AppMessageEvent) => {
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(`${t("tickets.notification.message")} ${contact.name}`, {
          body: `${message.body} - ${format(new Date(), "HH:mm")}`,
          icon: contact.urlPicture,
          tag: String(ticket.id),
          // "renotify" ainda não está no tipo do TypeScript.
          ...({ renotify: true } as NotificationOptions)
        });
        notification.onclick = event => {
          event.preventDefault();
          window.focus();
          live.current.push(`/tickets/${ticket.uuid}`);
        };
        closeDesktopNotification(ticket.id);
        desktopNotifications.current = [notification, ...desktopNotifications.current];
      }
      const audio = new Audio(ALERT_SOUND);
      audio.volume = Math.min(1, Math.max(0, live.current.volume));
      audio.play().catch(() => undefined);
    };

    socket.on("ready", () => socket.emit("joinNotification"));

    socket.on(`company-${companyId}-ticket`, (data: TicketEvent) => {
      if (data.action === "updateUnread" || data.action === "delete") {
        setNotifications(prev => prev.filter(ticket => ticket.id !== data.ticketId));
        closeDesktopNotification(data.ticketId);
      }
    });

    socket.on(`company-${companyId}-appMessage`, (data: AppMessageEvent) => {
      if (!isNotifiableMessage(data, viewer)) return;
      setNotifications(prev => upsertFirst(prev, data.ticket));
      if (shouldAlert(data, viewer, live.current.openUuid, document.visibilityState === "visible")) notify(data);
    });

    return () => socket.disconnect();
  }, [companyId, userId, profile, allTicket, queues, t]);

  return (
    <>
      <IconButton
        onClick={event => setAnchorEl(prev => (prev ? null : event.currentTarget))}
        aria-label="Open Notifications"
        color="inherit"
        sx={{ color: "white" }}
      >
        <Badge overlap="rectangular" badgeContent={notifications.length} color="secondary">
          <ChatIcon />
        </Badge>
      </IconButton>
      <Popover
        disableScrollLock
        open={!!anchorEl}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: "100%", maxWidth: { xs: 270, md: 350 }, ml: 2, mr: 1 } } }}
      >
        <List dense sx={theme => ({ overflowY: "auto", maxHeight: 350, ...theme.scrollbarStyles })}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText>{t("notifications.noTickets")}</ListItemText>
            </ListItem>
          ) : (
            notifications.map(ticket => (
              <div key={ticket.id} onClick={() => setAnchorEl(null)}>
                <TicketListItem ticket={ticket} />
              </div>
            ))
          )}
        </List>
      </Popover>
    </>
  );
}
