import type { ContactRef, Ticket } from "./types";

// Mesmas ações do reducer de frontend/src/components/TicketsListCustom, sem
// mutar o estado anterior.
export type TicketsAction =
  | { type: "LOAD_TICKETS"; payload: Ticket[] }
  | { type: "RESET_UNREAD"; payload: number }
  | { type: "UPDATE_TICKET"; payload: Ticket }
  | { type: "UPDATE_TICKET_UNREAD_MESSAGES"; payload: Ticket }
  | { type: "UPDATE_TICKET_CONTACT"; payload: ContactRef }
  | { type: "DELETE_TICKET"; payload: number }
  | { type: "RESET" };

const moveToTop = (list: Ticket[], index: number): Ticket[] => [list[index], ...list.filter((_, i) => i !== index)];

export const ticketsReducer = (state: Ticket[], action: TicketsAction): Ticket[] => {
  switch (action.type) {
    case "LOAD_TICKETS": {
      let next = [...state];
      for (const ticket of action.payload) {
        const index = next.findIndex(t => t.id === ticket.id);
        if (index === -1) {
          next.push(ticket);
          continue;
        }
        next[index] = ticket;
        // Ticket já listado que voltou com mensagens novas sobe para o topo.
        if (ticket.unreadMessages > 0) next = moveToTop(next, index);
      }
      return next;
    }
    case "RESET_UNREAD":
      return state.map(t => (t.id === action.payload ? { ...t, unreadMessages: 0 } : t));
    case "UPDATE_TICKET": {
      const index = state.findIndex(t => t.id === action.payload.id);
      if (index === -1) return [action.payload, ...state];
      return state.map((t, i) => (i === index ? action.payload : t));
    }
    case "UPDATE_TICKET_UNREAD_MESSAGES": {
      const rest = state.filter(t => t.id !== action.payload.id);
      return [action.payload, ...rest];
    }
    case "UPDATE_TICKET_CONTACT":
      return state.map(t => (t.contactId === action.payload.id ? { ...t, contact: action.payload } : t));
    case "DELETE_TICKET":
      return state.filter(t => t.id !== action.payload);
    case "RESET":
      return [];
    default:
      return state;
  }
};
