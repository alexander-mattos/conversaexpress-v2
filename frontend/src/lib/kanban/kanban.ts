import type { Tag, Ticket } from "@/lib/tickets/types";

export const OPEN_LANE = "open" as const;
export type LaneId = typeof OPEN_LANE | number;

export interface Lane {
  id: LaneId;
  tag: Tag | null;
  tickets: Ticket[];
}

interface Viewer {
  id: number;
  profile: string;
  queues: { id: number }[];
}

// Uma coluna por ticket: a primeira tag de kanban (na ordem das colunas) que
// ele tiver; sem tag de kanban (mesmo com tags comuns) fica em "Em aberto".
export const laneOf = (ticket: Ticket, kanbanTags: Tag[]): LaneId => {
  const ids = new Set((ticket.tags ?? []).map(tag => tag.id));
  return kanbanTags.find(tag => ids.has(tag.id))?.id ?? OPEN_LANE;
};

export const buildLanes = (tickets: Ticket[], kanbanTags: Tag[]): Lane[] => {
  const lanes: Lane[] = [{ id: OPEN_LANE, tag: null, tickets: [] }, ...kanbanTags.map(tag => ({ id: tag.id, tag, tickets: [] as Ticket[] }))];
  const byId = new Map(lanes.map(lane => [lane.id, lane]));
  for (const ticket of tickets) byId.get(laneOf(ticket, kanbanTags))?.tickets.push(ticket);
  return lanes;
};

// Mesma troca que o backend faz: sai das tags de kanban, mantém as comuns.
export const withLane = (ticket: Ticket, lane: LaneId, kanbanTags: Tag[]): Ticket => {
  const kanbanIds = new Set(kanbanTags.map(tag => tag.id));
  const common = (ticket.tags ?? []).filter(tag => !kanbanIds.has(tag.id));
  const target = lane === OPEN_LANE ? null : kanbanTags.find(tag => tag.id === lane);
  return { ...ticket, tags: target ? [...common, target] : common };
};

export const replaceTicket = (tickets: Ticket[], ticket: Ticket): Ticket[] =>
  tickets.some(t => t.id === ticket.id) ? tickets.map(t => (t.id === ticket.id ? ticket : t)) : [ticket, ...tickets];

// Mesma regra de visibilidade da API (GET /ticket/kanban).
export const isVisible = (ticket: Ticket, viewer: Viewer): boolean => {
  if (ticket.status !== "open" && ticket.status !== "pending") return false;
  if (viewer.profile === "admin") return true;
  if (ticket.userId === viewer.id) return true;
  if (ticket.status !== "pending") return false;
  return ticket.queueId === null || viewer.queues.some(queue => queue.id === ticket.queueId);
};

export const applyTicketEvent = (
  tickets: Ticket[],
  event: { action: string; ticket?: Ticket; ticketId?: number },
  viewer: Viewer
): Ticket[] => {
  if (event.action === "delete") {
    const id = event.ticketId ?? event.ticket?.id;
    return tickets.filter(t => t.id !== id);
  }
  if (event.action !== "update" || !event.ticket) return tickets;
  const ticket = event.ticket;
  if (!isVisible(ticket, viewer)) return tickets.filter(t => t.id !== ticket.id);
  return replaceTicket(tickets, ticket);
};

export const laneKey = (lane: LaneId): string => `lane-${lane}`;
export const parseLaneKey = (key: string): LaneId | null => {
  if (!key.startsWith("lane-")) return null;
  const raw = key.slice(5);
  if (raw === OPEN_LANE) return OPEN_LANE;
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
};
