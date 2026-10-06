// Formatos devolvidos pela API (GET /tickets, eventos do socket).
export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface QueueRef {
  id: number;
  name: string;
  color: string;
}

export interface ContactRef {
  id: number;
  name: string;
  number?: string;
  email?: string;
  profilePicUrl?: string;
  urlPicture?: string;
  isGroup?: boolean;
  extraInfo?: { id?: number; name: string; value: string }[];
}

export interface Ticket {
  id: number;
  uuid: string;
  status: "open" | "pending" | "closed" | string;
  unreadMessages: number;
  lastMessage: string;
  updatedAt: string;
  isGroup?: boolean;
  chatbot?: boolean;
  contactId: number;
  contact: ContactRef;
  userId: number | null;
  user?: { id: number; name: string } | null;
  queueId: number | null;
  queue?: QueueRef | null;
  whatsappId?: number | null;
  whatsapp?: { id: number; name: string } | null;
  tags?: Tag[];
  useIntegration?: boolean;
  promptId?: string | number | null;
  integrationId?: number | null;
}

export interface TicketMessage {
  id: string;
  ticketId: number;
  body: string;
  fromMe: boolean;
  read: boolean;
}

export type TicketEvent =
  | { action: "update"; ticket: Ticket }
  | { action: "delete"; ticketId: number; ticket?: Ticket }
  | { action: "updateUnread"; ticketId: number };

export interface AppMessageEvent {
  action: "create" | "update";
  message: TicketMessage;
  ticket: Ticket;
  contact: ContactRef;
}
