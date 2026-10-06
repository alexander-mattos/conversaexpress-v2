import { format, isValid, parseISO } from "date-fns";

export interface ChatUser {
  userId: number;
  unreads: number;
  user?: { id: number; name: string };
}

export interface Chat {
  id: number;
  uuid: string;
  title: string;
  ownerId: number;
  lastMessage?: string | null;
  updatedAt?: string;
  users?: ChatUser[];
}

export interface ChatMessage {
  id: number;
  chatId: number;
  senderId: number;
  message: string;
  createdAt: string;
  sender?: { id: number; name: string };
}

export const unreadsFor = (chat: Chat | null | undefined, userId?: number): number =>
  chat?.users?.find(chatUser => chatUser.userId === userId)?.unreads ?? 0;

export const totalUnreads = (chats: Chat[], userId?: number): number =>
  chats.reduce((sum, chat) => sum + unreadsFor(chat, userId), 0);

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "";
  const date = parseISO(value);
  return isValid(date) ? format(date, "dd/MM/yyyy HH:mm") : "";
};

// "data: última mensagem" (vazio quando ainda não há mensagem; antes saía "null").
export const secondaryText = (chat: Chat): string =>
  chat.lastMessage ? `${formatDateTime(chat.updatedAt)}: ${chat.lastMessage}` : "";

export type ChatEvent =
  | { action: "create" | "update"; record?: Chat; chat?: Chat }
  | { action: "new-message"; chat?: Chat; newMessage?: ChatMessage }
  | { action: "delete"; id: number | string };

// Lista de chats a partir dos eventos de socket, sem mutar o estado. Um chat
// novo (create ou primeira mensagem) entra no topo; antes só os já carregados
// eram atualizados.
export const applyChatEvent = (chats: Chat[], event: ChatEvent): Chat[] => {
  if (event.action === "delete") return chats.filter(chat => String(chat.id) !== String(event.id));
  const incoming = ("record" in event && event.record) || event.chat;
  if (!incoming) return chats;
  const exists = chats.some(chat => chat.id === incoming.id);
  if (!exists) return [incoming, ...chats];
  const updated = chats.map(chat => (chat.id === incoming.id ? { ...chat, ...incoming } : chat));
  if (event.action !== "new-message") return updated;
  // Conversa com mensagem nova sobe para o topo.
  const moved = updated.find(chat => chat.id === incoming.id) as Chat;
  return [moved, ...updated.filter(chat => chat.id !== incoming.id)];
};

// Mensagens: acrescenta sem duplicar (o próprio envio também volta pelo socket).
export const appendMessage = (messages: ChatMessage[], message: ChatMessage): ChatMessage[] =>
  messages.some(item => item.id === message.id) ? messages : [...messages, message];

export const prependMessages = (messages: ChatMessage[], older: ChatMessage[]): ChatMessage[] => {
  const known = new Set(messages.map(item => item.id));
  return [...older.filter(item => !known.has(item.id)), ...messages];
};
