import type { ContactRef } from "@/lib/tickets/types";

export interface Message {
  id: string;
  ticketId: number;
  body: string;
  fromMe: boolean;
  read?: boolean;
  ack?: number;
  mediaType?: string | null;
  mediaUrl?: string | null;
  isDeleted?: boolean;
  isEdited?: boolean;
  createdAt: string;
  contact?: ContactRef | null;
  quotedMsg?: Message | null;
}
