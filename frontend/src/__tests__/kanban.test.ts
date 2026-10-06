import { OPEN_LANE, applyTicketEvent, buildLanes, isVisible, laneOf, parseLaneKey, laneKey, withLane } from "@/lib/kanban/kanban";
import type { Tag, Ticket } from "@/lib/tickets/types";

const tag = (id: number): Tag => ({ id, name: `Tag ${id}`, color: "#000" });
const kanbanTags = [tag(10), tag(11)];
const ticket = (id: number, extra: Partial<Ticket> = {}): Ticket => ({
  id,
  uuid: `u${id}`,
  status: "pending",
  unreadMessages: 0,
  lastMessage: "",
  updatedAt: "",
  contactId: 1,
  contact: { id: 1, name: "Ana" },
  userId: null,
  queueId: 3,
  tags: [],
  ...extra
});
const atendente = { id: 5, profile: "user", queues: [{ id: 3 }] };

describe("kanban: uma coluna por ticket", () => {
  it("só tags comuns ficam em Em aberto; várias de kanban ficam na primeira coluna", () => {
    expect(laneOf(ticket(1, { tags: [tag(99)] }), kanbanTags)).toBe(OPEN_LANE);
    expect(laneOf(ticket(2, { tags: [tag(11), tag(10)] }), kanbanTags)).toBe(10);
    const lanes = buildLanes([ticket(1, { tags: [tag(99)] }), ticket(2, { tags: [tag(11)] })], kanbanTags);
    expect(lanes.map(l => [l.id, l.tickets.map(t => t.id)])).toEqual([
      [OPEN_LANE, [1]],
      [10, []],
      [11, [2]]
    ]);
  });

  it("mover troca a tag de kanban e mantém as comuns, sem mutar", () => {
    const original = ticket(1, { tags: [tag(99), tag(10)] });
    const moved = withLane(original, 11, kanbanTags);
    expect(moved.tags?.map(t => t.id)).toEqual([99, 11]);
    expect(withLane(original, OPEN_LANE, kanbanTags).tags?.map(t => t.id)).toEqual([99]);
    expect(original.tags?.map(t => t.id)).toEqual([99, 10]);
  });

  it("ids das colunas", () => {
    expect(parseLaneKey(laneKey(OPEN_LANE))).toBe(OPEN_LANE);
    expect(parseLaneKey(laneKey(11))).toBe(11);
    expect(parseLaneKey("ticket-1")).toBeNull();
  });
});

describe("kanban: ao vivo", () => {
  it("visibilidade igual à da API", () => {
    expect(isVisible(ticket(1), atendente)).toBe(true);
    expect(isVisible(ticket(1, { queueId: 9 }), atendente)).toBe(false);
    expect(isVisible(ticket(1, { status: "open", userId: 9 }), atendente)).toBe(false);
    expect(isVisible(ticket(1, { status: "open", userId: 5, queueId: 9 }), atendente)).toBe(true);
    expect(isVisible(ticket(1, { status: "closed" }), { ...atendente, profile: "admin" })).toBe(false);
  });

  it("update entra ou atualiza; fechado ou fora das filas sai; delete sai", () => {
    const list = [ticket(1), ticket(2)];
    expect(applyTicketEvent(list, { action: "update", ticket: ticket(3) }, atendente).map(t => t.id)).toEqual([3, 1, 2]);
    const updated = applyTicketEvent(list, { action: "update", ticket: ticket(1, { tags: [tag(10)] }) }, atendente);
    expect(updated[0].tags?.[0].id).toBe(10);
    expect(applyTicketEvent(list, { action: "update", ticket: ticket(1, { status: "closed" }) }, atendente).map(t => t.id)).toEqual([2]);
    expect(applyTicketEvent(list, { action: "delete", ticketId: 2 }, atendente).map(t => t.id)).toEqual([1]);
  });
});
