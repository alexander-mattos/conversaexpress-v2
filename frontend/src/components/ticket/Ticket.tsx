"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Box, Paper } from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import { ReplyMessageProvider } from "@/contexts/ReplyMessageContext";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import type { ContactRef, Ticket as TicketData, TicketEvent } from "@/lib/tickets/types";
import ContactDrawer, { DRAWER_WIDTH } from "./ContactDrawer";
import MessageInput from "./MessageInput";
import MessagesList from "./MessagesList";
import TagsContainer from "./TagsContainer";
import TicketActionButtons from "./TicketActionButtons";
import TicketHeader from "./TicketHeader";
import TicketInfo from "./TicketInfo";

// Conversa do ticket (porta de frontend/src/components/Ticket). Quem usa
// troca a "key" ao mudar de ticket, o que recomeça o estado.
export default function Ticket({ uuid }: { uuid: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [contact, setContact] = useState<ContactRef | null>(null);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get<TicketData>(`/tickets/u/${uuid}`);
        if (!active) return;
        // Atendente só abre tickets das próprias filas (como hoje).
        if (!user.queues.some(q => q.id === data.queueId) && user.profile !== "admin") {
          toast.error(t("tickets.toasts.unauthorized"));
          router.push("/tickets");
          return;
        }
        setTicket(data);
        setContact(data.contact);
        setLoading(false);
      } catch (err) {
        if (active) {
          setLoading(false);
          toastError(err);
        }
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [uuid, user, router, t]);

  const companyId = user?.companyId;
  const userId = user?.id;
  const ticketId = ticket?.id;
  useEffect(() => {
    if (!companyId || !ticketId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on("ready", () => socket.emit("joinChatBox", `${ticketId}`));
    socket.on(`company-${companyId}-ticket`, (data: TicketEvent) => {
      if (data.action === "update" && data.ticket.id === ticketId) setTicket(data.ticket);
      if (data.action === "delete" && data.ticketId === ticketId) router.push("/tickets");
    });
    socket.on(`company-${companyId}-contact`, (data: { action: string; contact: ContactRef }) => {
      if (data.action === "update") setContact(prev => (prev && prev.id === data.contact?.id ? { ...prev, ...data.contact } : prev));
    });
    return () => socket.disconnect();
  }, [companyId, userId, ticketId, router]);

  return (
    <Box sx={{ display: "flex", height: "100%", position: "relative", overflow: "hidden" }} id="drawer-container">
      <Paper
        variant="outlined"
        elevation={0}
        sx={theme => ({
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderLeft: "0",
          mr: drawerOpen ? 0 : `-${DRAWER_WIDTH}px`,
          ...(drawerOpen && { borderTopRightRadius: 0, borderBottomRightRadius: 0 }),
          transition: theme.transitions.create("margin", {
            easing: drawerOpen ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
            duration: drawerOpen ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen
          })
        })}
      >
        <TicketHeader loading={loading}>
          {ticket && contact && <TicketInfo contact={contact} ticket={ticket} onClick={() => setDrawerOpen(true)} />}
          {ticket && <TicketActionButtons ticket={ticket} />}
        </TicketHeader>
        <Paper>{ticket && <TagsContainer ticket={ticket} />}</Paper>
        {ticket && (
          <ReplyMessageProvider>
            <MessagesList ticketId={ticket.id} isGroup={ticket.isGroup} />
            <MessageInput ticketId={ticket.id} ticketStatus={ticket.status} />
          </ReplyMessageProvider>
        )}
      </Paper>
      <ContactDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} contact={contact} ticket={ticket} loading={loading} />
    </Box>
  );
}
