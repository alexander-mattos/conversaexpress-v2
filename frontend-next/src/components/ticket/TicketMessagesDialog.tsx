"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Box, Button, Dialog, DialogActions } from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import { ReplyMessageProvider } from "@/contexts/ReplyMessageContext";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import type { ContactRef, Ticket, TicketEvent } from "@/lib/tickets/types";
import MessagesList from "./MessagesList";
import TicketHeader from "./TicketHeader";
import TicketInfo from "./TicketInfo";

// "Espiar conversa" (admin): mensagens do ticket sem abrir o atendimento.
export default function TicketMessagesDialog({ open, onClose, ticketId }: { open: boolean; onClose: () => void; ticketId: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [contact, setContact] = useState<ContactRef | null>(null);

  useEffect(() => {
    if (!open || !user) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get<Ticket>(`/tickets/${ticketId}`);
        if (!active) return;
        if (!user.queues.some(q => q.id === data.queueId) && user.profile !== "admin") {
          toast.error("Acesso não permitido");
          router.push("/tickets");
          return;
        }
        setTicket(data);
        setContact(data.contact);
      } catch (err) {
        toastError(err);
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, ticketId, user, router]);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!open || !companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-ticket`, (data: TicketEvent) => {
      if (data.action === "update" && data.ticket.id === ticketId) setTicket(data.ticket);
      if (data.action === "delete" && data.ticketId === ticketId) router.push("/tickets");
    });
    socket.on(`company-${companyId}-contact`, (data: { action: string; contact: ContactRef }) => {
      if (data.action === "update") setContact(prev => (prev && prev.id === data.contact?.id ? { ...prev, ...data.contact } : prev));
    });
    return () => socket.disconnect();
  }, [open, companyId, userId, ticketId, router]);

  return (
    <Dialog maxWidth="md" onClose={onClose} open={open}>
      <TicketHeader loading={!ticket}>
        {ticket && contact && ticket.user !== undefined && <TicketInfo contact={contact} ticket={ticket} onClick={() => undefined} />}
      </TicketHeader>
      <ReplyMessageProvider>
        <Box sx={{ display: "flex", height: "100%", position: "relative", overflow: "hidden" }}>
          {open && <MessagesList ticketId={ticketId} isGroup={ticket?.isGroup} />}
        </Box>
      </ReplyMessageProvider>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
