"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { Alert, Box, CircularProgress } from "@mui/material";
import { MainContainer } from "@/components/page/PageLayout";
import KanbanLane from "@/components/kanban/KanbanLane";
import { KanbanCardContent } from "@/components/kanban/KanbanCard";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { OPEN_LANE, applyTicketEvent, buildLanes, laneOf, parseLaneKey, replaceTicket, withLane } from "@/lib/kanban/kanban";
import type { Tag, Ticket, TicketEvent } from "@/lib/tickets/types";

// Porta de frontend/src/pages/Kanban, com @dnd-kit no lugar do react-trello.
export default function KanbanPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const allowed = usePlanGuard("useKanban", { adminOnly: false });
  const [tags, setTags] = useState<Tag[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<Ticket | null>(null);

  const companyId = user?.companyId;
  const userId = user?.id;
  const profile = user?.profile;
  const queueIds = useMemo(() => (user?.queues ?? []).map(queue => queue.id), [user?.queues]);
  const viewer = useMemo(
    () => (userId && profile ? { id: userId, profile, queues: queueIds.map(id => ({ id })) } : null),
    [userId, profile, queueIds]
  );

  const loadTags = useCallback(async () => {
    const { data } = await api.get<{ lista: Tag[] }>("/tags/kanban");
    setTags(data.lista ?? []);
  }, []);

  useEffect(() => {
    if (!allowed || !profile) return undefined;
    let active = true;
    (async () => {
      try {
        await loadTags();
        const { data } = await api.get<{ tickets: Ticket[] }>("/ticket/kanban", {
          params: { queueIds: JSON.stringify(queueIds), showAll: profile === "admin" }
        });
        if (active) setTickets(data.tickets ?? []);
      } catch (err) {
        if (active) toastError(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [allowed, profile, queueIds, loadTags]);

  // Ao vivo: tickets (mudança de coluna, status, novos) e tags de kanban.
  useEffect(() => {
    if (!allowed || !companyId || !userId || !viewer) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on("ready", () => {
      socket.emit("joinTickets", "pending");
      socket.emit("joinTickets", "open");
    });
    socket.on(`company-${companyId}-ticket`, (data: TicketEvent) => {
      setTickets(prev => applyTicketEvent(prev, data, viewer));
    });
    socket.on("tag", () => {
      loadTags().catch(toastError);
    });
    return () => socket.disconnect();
  }, [allowed, companyId, userId, viewer, loadTags]);

  const lanes = useMemo(() => buildLanes(tickets, tags), [tickets, tags]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleOpen = useCallback((uuid: string) => router.push(`/tickets/${uuid}`), [router]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const ticketId = active.data.current?.ticketId as number | undefined;
    setDragging(tickets.find(ticket => ticket.id === ticketId) ?? null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const ticketId = active.data.current?.ticketId as number | undefined;
    const target = over ? parseLaneKey(String(over.id)) : null;
    const previous = tickets.find(ticket => ticket.id === ticketId);
    if (!previous || target === null || laneOf(previous, tags) === target) return;

    // Otimista: move já; se a API recusar, volta o cartão para onde estava.
    setTickets(prev => replaceTicket(prev, withLane(previous, target, tags)));
    try {
      const { data } = await api.put<Ticket>(`/ticket-tags/${previous.id}/kanban`, {
        tagId: target === OPEN_LANE ? null : target
      });
      setTickets(prev => replaceTicket(prev, data));
      toast.success(t(target === OPEN_LANE ? "kanban.toasts.removed" : "kanban.toasts.added"));
    } catch (err) {
      setTickets(prev => replaceTicket(prev, previous));
      toastError(err);
    }
  };

  if (!allowed) return null;

  return (
    <MainContainer>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tags.length === 0 && (
            <Alert severity="info" sx={{ mb: 1 }}>
              {t("kanban.noTags")}
            </Alert>
          )}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(null)}>
            <Box
              data-testid="kanban-board"
              sx={{ display: "flex", gap: 1.5, alignItems: "stretch", overflowX: "auto", flex: 1, minHeight: 0, pb: 1 }}
            >
              {lanes.map(lane => (
                <KanbanLane key={String(lane.id)} lane={lane} onOpen={handleOpen} />
              ))}
            </Box>
            <DragOverlay>{dragging && <KanbanCardContent ticket={dragging} onOpen={handleOpen} overlay />}</DragOverlay>
          </DndContext>
        </>
      )}
    </MainContainer>
  );
}
