import { ticketsReducer } from "@/lib/tickets/listReducer";
import {
  filterForProfile,
  greetingEnabled,
  isNotifiableMessage,
  shouldAlert,
  shouldUpdateTicket
} from "@/lib/tickets/rules";
import type { AppMessageEvent, Ticket } from "@/lib/tickets/types";

const ticket = (id: number, extra: Partial<Ticket> = {}): Ticket => ({
  id,
  uuid: `uuid-${id}`,
  status: "open",
  unreadMessages: 0,
  lastMessage: "",
  updatedAt: "2026-10-04T10:00:00.000Z",
  contactId: id * 10,
  contact: { id: id * 10, name: `Contato ${id}` },
  userId: null,
  queueId: null,
  ...extra
});

describe("reducer da lista de tickets", () => {
  it("carrega, atualiza no lugar e sobe quem tem não lidas", () => {
    let state = ticketsReducer([], { type: "LOAD_TICKETS", payload: [ticket(1), ticket(2), ticket(3)] });
    expect(state.map(t => t.id)).toEqual([1, 2, 3]);

    state = ticketsReducer(state, { type: "LOAD_TICKETS", payload: [ticket(3, { unreadMessages: 2 })] });
    expect(state.map(t => t.id)).toEqual([3, 1, 2]);

    state = ticketsReducer(state, { type: "UPDATE_TICKET", payload: ticket(1, { lastMessage: "oi" }) });
    expect(state.map(t => t.id)).toEqual([3, 1, 2]);
    expect(state[1].lastMessage).toBe("oi");
  });

  it("mensagem nova leva o ticket ao topo; zera não lidas; remove", () => {
    const initial = [ticket(1), ticket(2, { unreadMessages: 1 })];
    let state = ticketsReducer(initial, { type: "UPDATE_TICKET_UNREAD_MESSAGES", payload: ticket(2, { unreadMessages: 3 }) });
    expect(state.map(t => [t.id, t.unreadMessages])).toEqual([
      [2, 3],
      [1, 0]
    ]);
    state = ticketsReducer(state, { type: "RESET_UNREAD", payload: 2 });
    expect(state[0].unreadMessages).toBe(0);
    state = ticketsReducer(state, { type: "DELETE_TICKET", payload: 1 });
    expect(state.map(t => t.id)).toEqual([2]);
    expect(initial[1].unreadMessages).toBe(1);
  });

  it("atualiza o contato pelo contactId", () => {
    const state = ticketsReducer([ticket(1)], { type: "UPDATE_TICKET_CONTACT", payload: { id: 10, name: "Novo nome" } });
    expect(state[0].contact.name).toBe("Novo nome");
  });
});

describe("regras da lista", () => {
  it("shouldUpdateTicket: dono, mostrar todos e filas", () => {
    expect(shouldUpdateTicket(ticket(1, { userId: 5, queueId: 2 }), 5, false, [2])).toBe(true);
    expect(shouldUpdateTicket(ticket(1, { userId: 9, queueId: 2 }), 5, false, [2])).toBe(false);
    expect(shouldUpdateTicket(ticket(1, { userId: 9, queueId: 2 }), 5, true, [2])).toBe(true);
    expect(shouldUpdateTicket(ticket(1, { queueId: 3 }), 5, true, [2])).toBe(false);
    expect(shouldUpdateTicket(ticket(1), 5, false, [])).toBe(true);
  });

  it("perfil user só vê as próprias filas", () => {
    const list = [ticket(1, { queueId: 2 }), ticket(2, { queueId: 3 }), ticket(3)];
    expect(filterForProfile(list, "user", [{ id: 2 }]).map(t => t.id)).toEqual([1]);
    expect(filterForProfile(list, "admin", [{ id: 2 }])).toHaveLength(3);
  });

  it("saudação ao aceitar só com a configuração habilitada (sem quebrar se faltar)", () => {
    expect(greetingEnabled([{ key: "sendGreetingAccepted", value: "enabled" }])).toBe(true);
    expect(greetingEnabled([{ key: "sendGreetingAccepted", value: "disabled" }])).toBe(false);
    expect(greetingEnabled([])).toBe(false);
    expect(greetingEnabled(undefined)).toBe(false);
  });
});

describe("notificações", () => {
  const user = { id: 5, profile: "user", queues: [{ id: 2 }] };
  const event = (ticketExtra: Partial<Ticket>, messageExtra: Partial<AppMessageEvent["message"]> = {}): AppMessageEvent => ({
    action: "create",
    message: { id: "m1", ticketId: 1, body: "oi", fromMe: false, read: false, ...messageExtra },
    ticket: ticket(1, ticketExtra),
    contact: { id: 10, name: "Contato" }
  });

  it("mensagem recebida, não lida, do usuário ou sem dono, na fila dele", () => {
    expect(isNotifiableMessage(event({ queueId: 2 }), user)).toBe(true);
    expect(isNotifiableMessage(event({ queueId: 2 }, { fromMe: true }), user)).toBe(false);
    expect(isNotifiableMessage(event({ queueId: 2 }, { read: true }), user)).toBe(false);
    expect(isNotifiableMessage(event({ queueId: 2, userId: 9 }), user)).toBe(false);
    expect(isNotifiableMessage(event({ queueId: 3 }), user)).toBe(false);
  });

  it("pendentes só para quem tem allTicket 'enabled' (antes nunca notificava)", () => {
    expect(isNotifiableMessage(event({ status: "pending" }), user)).toBe(false);
    expect(isNotifiableMessage(event({ status: "pending" }), { ...user, allTicket: "enabled" })).toBe(true);
    expect(isNotifiableMessage(event({ status: "pending" }), { ...user, allTicket: "disabled" })).toBe(false);
  });

  it("não toca para o ticket aberto com a aba visível (antes sempre tocava)", () => {
    const data = event({});
    expect(shouldAlert(data, user, "uuid-1", true)).toBe(false);
    expect(shouldAlert(data, user, "uuid-1", false)).toBe(true);
    expect(shouldAlert(data, user, "uuid-2", true)).toBe(true);
    expect(shouldAlert(event({ isGroup: true }), user, null, true)).toBe(false);
    expect(shouldAlert(event({ userId: 9 }), user, null, true)).toBe(false);
  });
});
