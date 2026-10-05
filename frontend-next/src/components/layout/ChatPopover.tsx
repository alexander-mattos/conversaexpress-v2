"use client";

import { useEffect, useRef, useState, type MouseEvent, type UIEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Badge, IconButton, List, ListItemButton, ListItemText, Paper, Popover, Typography } from "@mui/material";
import ForumIcon from "@mui/icons-material/Forum";
import { useAuth } from "@/contexts/AuthContext";
import { useChats } from "@/hooks/useChats";
import { formatDateTime, totalUnreads, type ChatMessage } from "@/lib/chats/chats";
import { socketManager } from "@/lib/socket";

const CHAT_SOUND = "/sounds/chat_notify.mp3";

// Porta de frontend/src/pages/Chat/ChatPopover (barra superior). O ponto
// reflete os não lidos de verdade; o som toca só para mensagens de outros
// participantes (os eventos agora só chegam a quem participa); abrir uma
// conversa navega sem recarregar a página.
export default function ChatPopover({ volume }: { volume: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { chats, loadMore } = useChats(user?.companyId, user?.id);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId || !userId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    const onChat = (data: { action: string; newMessage?: ChatMessage }) => {
      if (data.action !== "new-message" || !data.newMessage || data.newMessage.senderId === userId) return;
      const audio = new Audio(CHAT_SOUND);
      audio.volume = Math.min(1, Math.max(0, volumeRef.current));
      audio.play().catch(() => undefined);
    };
    socket.on(`company-${companyId}-chat`, onChat);
    return () => socket.off(`company-${companyId}-chat`, onChat);
  }, [companyId, userId]);

  const unread = totalUnreads(chats, userId) > 0;

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) loadMore();
  };

  return (
    <>
      <IconButton
        aria-label="internal chat"
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        sx={{ color: "white" }}
      >
        <Badge color="secondary" variant="dot" invisible={!unread} data-testid="chat-popover-dot">
          <ForumIcon />
        </Badge>
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Paper variant="outlined" onScroll={handleScroll} sx={theme => ({ maxHeight: 300, maxWidth: 500, p: 1, overflowY: "scroll", ...theme.scrollbarStyles })}>
          <List component="nav" sx={{ minWidth: 300 }}>
            {chats.map((chat, index) => (
              <ListItemButton
                key={chat.id}
                onClick={() => {
                  setAnchor(null);
                  router.push(`/chats/${chat.uuid}`);
                }}
                sx={{ background: index % 2 === 0 ? "#ededed" : "white", color: "rgba(0, 0, 0, 0.87)", border: "1px solid #eee", cursor: "pointer" }}
              >
                <ListItemText
                  primary={chat.lastMessage || chat.title}
                  secondary={
                    <Typography component="span" sx={{ fontSize: 12, color: "rgba(0, 0, 0, 0.54)" }}>
                      {formatDateTime(chat.updatedAt)}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
            {chats.length === 0 && <ListItemText primary={t("mainDrawer.appBar.notRegister")} />}
          </List>
        </Paper>
      </Popover>
    </>
  );
}
