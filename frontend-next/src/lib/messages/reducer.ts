import type { Message } from "./types";

// Mesmas ações do reducer de frontend/src/components/MessagesList, sem mutar
// o estado. Cada página (mais antiga) chega em ordem cronológica e entra antes.
export type MessagesAction =
  | { type: "LOAD_MESSAGES"; payload: Message[] }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGE"; payload: Message }
  | { type: "RESET" };

export const messagesReducer = (state: Message[], action: MessagesAction): Message[] => {
  switch (action.type) {
    case "LOAD_MESSAGES": {
      const byId = new Map(action.payload.map(m => [m.id, m]));
      const updated = state.map(m => byId.get(m.id) ?? m);
      const known = new Set(state.map(m => m.id));
      return [...action.payload.filter(m => !known.has(m.id)), ...updated];
    }
    case "ADD_MESSAGE":
      return state.some(m => m.id === action.payload.id)
        ? state.map(m => (m.id === action.payload.id ? action.payload : m))
        : [...state, action.payload];
    case "UPDATE_MESSAGE":
      return state.map(m => (m.id === action.payload.id ? action.payload : m));
    case "RESET":
      return [];
    default:
      return state;
  }
};

// Mensagem de localização: "imagem|link|descrição".
export const parseLocation = (body: string): { image: string; link: string; description: string | null } | null => {
  const parts = body.split("|");
  if (parts.length < 2) return null;
  return { image: parts[0], link: parts[1], description: parts.length > 2 ? parts[2] : null };
};

export const safeHttpUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

export const safeImageSrc = (value: string): string | null => {
  const trimmed = String(value || "").trim();
  if (/^data:image\//i.test(trimmed)) return trimmed;
  return safeHttpUrl(trimmed);
};
