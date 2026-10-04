"use client";

import { useEffect, useReducer, useState, type CSSProperties, type UIEvent } from "react";
import { useTranslation } from "react-i18next";
import { Box, List, Paper } from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { ticketsReducer } from "@/lib/tickets/listReducer";
import { filterForProfile, notBelongsToSelectedQueues, shouldUpdateTicket } from "@/lib/tickets/rules";
import type { AppMessageEvent, ContactRef, Ticket, TicketEvent } from "@/lib/tickets/types";
import TicketListItem from "./TicketListItem";
import TicketsListSkeleton from "./TicketsListSkeleton";

export interface TicketsListProps {
  status?: "open" | "pending" | "closed";
  searchParam?: string;
  tags?: number[];
  users?: number[];
  showAll?: boolean;
  selectedQueueIds: number[];
  updateCount?: (count: number) => void;
  style?: CSSProperties;
  onSelect?: () => void;
}

const SEARCH_DEBOUNCE = 500;

// Porta de frontend/src/components/TicketsListCustom. Os filtros são fixos
// por instância: quem usa troca a "key" quando eles mudam, o que recomeça a
// lista da página 1 (o frontend atual fazia isso com RESET).
export default function TicketsList({
  status,
  searchParam,
  tags,
  users,
  showAll = false,
  selectedQueueIds,
  updateCount,
  style,
  onSelect
}: TicketsListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tickets, dispatch] = useReducer(ticketsReducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const profile = user?.profile;
  const userQueues = user?.queues;

  // GET /tickets da página atual.
  useEffect(() => {
    if (!profile || !userQueues) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get<{ tickets: Ticket[]; hasMore: boolean }>("/tickets", {
          params: {
            searchParam,
            pageNumber,
            status,
            showAll,
            tags: JSON.stringify(tags ?? []),
            users: JSON.stringify(users ?? []),
            queueIds: JSON.stringify(selectedQueueIds)
          }
        });
        if (!active) return;
        dispatch({ type: "LOAD_TICKETS", payload: filterForProfile(data.tickets, profile, userQueues) });
        setHasMore(data.hasMore);
      } catch (err) {
        if (active) toastError(err);
      } finally {
        if (active) setLoading(false);
      }
    }, SEARCH_DEBOUNCE);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pageNumber, searchParam, status, showAll, tags, users, selectedQueueIds, profile, userQueues]);

  // Atualizações em tempo real (mesmos eventos e regras do frontend atual).
  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId || !userId || !profile || !userQueues) return undefined;
    const socket = socketManager.getSocket(companyId, userId);

    socket.on("ready", () => {
      if (status) socket.emit("joinTickets", status);
      else socket.emit("joinNotification");
    });

    socket.on(`company-${companyId}-ticket`, (data: TicketEvent) => {
      if (data.action === "updateUnread") dispatch({ type: "RESET_UNREAD", payload: data.ticketId });
      if (data.action === "update") {
        if (shouldUpdateTicket(data.ticket, userId, showAll, selectedQueueIds) && data.ticket.status === status) {
          dispatch({ type: "UPDATE_TICKET", payload: data.ticket });
        }
        if (notBelongsToSelectedQueues(data.ticket, selectedQueueIds)) {
          dispatch({ type: "DELETE_TICKET", payload: data.ticket.id });
        }
      }
      if (data.action === "delete") dispatch({ type: "DELETE_TICKET", payload: data.ticketId });
    });

    socket.on(`company-${companyId}-appMessage`, (data: AppMessageEvent) => {
      if (profile === "user") {
        const queueIds = userQueues.map(q => q.id);
        if (!data.ticket?.queueId || !queueIds.includes(data.ticket.queueId)) return;
      }
      if (
        data.action === "create" &&
        shouldUpdateTicket(data.ticket, userId, showAll, selectedQueueIds) &&
        (status === undefined || data.ticket.status === status)
      ) {
        dispatch({ type: "UPDATE_TICKET_UNREAD_MESSAGES", payload: data.ticket });
      }
    });

    socket.on(`company-${companyId}-contact`, (data: { action: string; contact: ContactRef }) => {
      if (data.action === "update") dispatch({ type: "UPDATE_TICKET_CONTACT", payload: data.contact });
    });

    return () => socket.disconnect();
  }, [companyId, userId, status, showAll, selectedQueueIds, profile, userQueues]);

  useEffect(() => {
    updateCount?.(tickets.length);
  }, [tickets.length, updateCount]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      setLoading(true);
      setPageNumber(prev => prev + 1);
    }
  };

  return (
    <Paper
      style={style}
      sx={{
        position: "relative",
        display: "flex",
        height: "100%",
        flexDirection: "column",
        overflow: "hidden",
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0
      }}
    >
      <Paper
        square
        elevation={0}
        onScroll={handleScroll}
        sx={theme => ({
          flex: 1,
          maxHeight: "100%",
          overflowY: "scroll",
          ...theme.scrollbarStyles,
          borderTop: "2px solid rgba(0, 0, 0, 0.12)"
        })}
      >
        <List sx={{ pt: 0 }}>
          {tickets.length === 0 && !loading ? (
            <Box sx={{ display: "flex", height: "100px", m: "40px", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <Box component="span" sx={{ textAlign: "center", fontSize: "16px", fontWeight: 600, m: 0 }}>
                {t("ticketsList.noTicketsTitle")}
              </Box>
              <Box component="p" sx={{ textAlign: "center", color: "rgb(104, 121, 146)", fontSize: "14px", lineHeight: 1.4 }}>
                {t("ticketsList.noTicketsMessage")}
              </Box>
            </Box>
          ) : (
            tickets.map(ticket => <TicketListItem ticket={ticket} key={ticket.id} onSelect={onSelect} />)
          )}
          {loading && <TicketsListSkeleton />}
        </List>
      </Paper>
    </Paper>
  );
}
