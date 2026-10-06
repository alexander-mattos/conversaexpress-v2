"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Message } from "@/lib/messages/types";

interface ReplyValue {
  replyingMessage: Message | null;
  setReplyingMessage: (message: Message | null) => void;
}

const ReplyMessageContext = createContext<ReplyValue>({ replyingMessage: null, setReplyingMessage: () => undefined });

export const useReplyMessage = (): ReplyValue => useContext(ReplyMessageContext);

// Mensagem sendo respondida (citada) no campo de envio.
export function ReplyMessageProvider({ children }: { children: ReactNode }) {
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const value = useMemo(() => ({ replyingMessage, setReplyingMessage }), [replyingMessage]);
  return <ReplyMessageContext.Provider value={value}>{children}</ReplyMessageContext.Provider>;
}
