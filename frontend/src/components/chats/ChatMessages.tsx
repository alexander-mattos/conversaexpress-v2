"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Box, CircularProgress, FormControl, IconButton, Input, InputAdornment, Paper, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { api } from "@/lib/api";
import { appendMessage, formatDateTime, prependMessages, unreadsFor, type Chat, type ChatMessage } from "@/lib/chats/chats";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

const bubble = {
  p: "10px 10px 5px",
  position: "relative",
  maxWidth: 300,
  borderRadius: "10px",
  border: "1px solid rgba(0, 0, 0, 0.12)",
  color: "#fff",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word"
} as const;

// Porta de frontend/src/pages/Chat/ChatMessages.
// - marca como lido também quando chega mensagem com o chat aberto;
// - carregar as anteriores mantém a posição; só desce sozinho se já estava no fim;
// - Enter envia, Shift+Enter quebra linha.
export default function ChatMessages({ chat, companyId, userId }: { chat: Chat; companyId: number; userId: number }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const restoreFrom = useRef<number | null>(null);
  const chatId = chat.id;
  const unreads = unreadsFor(chat, userId);

  useEffect(() => {
    let active = true;
    api
      .get<{ records: ChatMessage[]; hasMore: boolean }>(`/chats/${chatId}/messages`, { params: { pageNumber: page } })
      .then(({ data }) => {
        if (!active) return;
        if (page > 1 && listRef.current) restoreFrom.current = listRef.current.scrollHeight - listRef.current.scrollTop;
        setMessages(current => (page === 1 ? data.records : prependMessages(current, data.records)));
        setHasMore(data.hasMore);
      })
      .catch(err => active && toastError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [chatId, page]);

  // Ao abrir e quando chega mensagem de outro participante com o chat aberto.
  useEffect(() => {
    if (unreads > 0) api.post(`/chats/${chatId}/read`).catch(() => undefined);
  }, [chatId, unreads]);

  useEffect(() => {
    const socket = socketManager.getSocket(companyId, userId);
    const onEvent = (data: { action: string; newMessage?: ChatMessage }) => {
      if (data.action === "new-message" && data.newMessage) {
        const message = data.newMessage;
        setMessages(current => appendMessage(current, message));
      }
    };
    socket.on(`company-${companyId}-chat-${chatId}`, onEvent);
    return () => socket.off(`company-${companyId}-chat-${chatId}`, onEvent);
  }, [companyId, userId, chatId]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (restoreFrom.current !== null) {
      list.scrollTop = list.scrollHeight - restoreFrom.current;
      restoreFrom.current = null;
    } else if (atBottom.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    atBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    if (list.scrollTop < 600 && hasMore && !loading) {
      setLoading(true);
      setPage(current => current + 1);
    }
  };

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    atBottom.current = true;
    try {
      const { data } = await api.post<ChatMessage>(`/chats/${chatId}/messages`, { message });
      setMessages(current => appendMessage(current, data));
      setText("");
    } catch (err) {
      toastError(err);
    }
    setSending(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <Paper
      sx={{ display: "flex", flexDirection: "column", position: "relative", flex: 1, overflow: "hidden", borderRadius: 0, height: "100%", borderLeft: "1px solid rgba(0, 0, 0, 0.12)" }}
    >
      <Box
        ref={listRef}
        onScroll={handleScroll}
        data-testid="chat-messages"
        sx={theme => ({ position: "relative", overflowY: "auto", height: "100%", bgcolor: "chatlist", ...theme.scrollbarStyles })}
      >
        {loading && page > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
            <CircularProgress size={20} />
          </Box>
        )}
        {messages.map(item => {
          const mine = item.senderId === userId;
          return (
            <Box
              key={item.id}
              data-testid={mine ? "chat-message-mine" : "chat-message-other"}
              sx={{
                ...bubble,
                m: mine ? "10px 10px 10px auto" : "10px",
                backgroundColor: mine ? "green" : "blue",
                textAlign: mine ? "right" : "left",
                ...(mine ? { borderBottomRightRadius: 0 } : { borderBottomLeftRadius: 0 })
              }}
            >
              <Typography variant="subtitle2">{item.sender?.name}</Typography>
              {item.message}
              <Typography variant="caption" sx={{ display: "block" }}>
                {formatDateTime(item.createdAt)}
              </Typography>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ position: "relative", height: "auto" }}>
        <FormControl variant="outlined" fullWidth>
          <Input
            multiline
            maxRows={6}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            sx={{ p: "20px" }}
            placeholder={t("chat.messagePlaceholder")}
            slotProps={{ input: { "aria-label": t("chat.messagePlaceholder") } }}
            endAdornment={
              <InputAdornment position="end">
                <IconButton aria-label="send chat message" onClick={send} disabled={sending || !text.trim()} sx={{ m: 1 }}>
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>
      </Box>
    </Paper>
  );
}
