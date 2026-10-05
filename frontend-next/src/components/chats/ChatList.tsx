"use client";

import { useState, type UIEvent } from "react";
import { useTranslation } from "react-i18next";
import { Box, Chip, IconButton, List, ListItemButton, ListItemText } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ConfirmationModal from "@/components/ConfirmationModal";
import { secondaryText, unreadsFor, type Chat } from "@/lib/chats/chats";

// Porta de frontend/src/pages/Chat/ChatList. Editar e excluir só para o dono.
export default function ChatList({
  chats,
  currentUuid,
  userId,
  onSelect,
  onEdit,
  onDelete,
  onLoadMore
}: {
  chats: Chat[];
  currentUuid?: string;
  userId?: number;
  onSelect: (chat: Chat) => void;
  onEdit: (chat: Chat) => void;
  onDelete: (chat: Chat) => void;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState<Chat | null>(null);

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) onLoadMore();
  };

  return (
    <>
      <ConfirmationModal
        title={t("chat.confirm.title")}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && onDelete(deleting)}
      >
        {t("chat.confirm.message")}
      </ConfirmationModal>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          flex: 1,
          height: "calc(100% - 58px)",
          overflow: "hidden",
          borderRadius: 0,
          bgcolor: "boxlist"
        }}
      >
        <Box
          onScroll={handleScroll}
          sx={theme => ({ display: "flex", flexDirection: "column", position: "relative", flex: 1, overflowY: "scroll", ...theme.scrollbarStyles })}
        >
          <List>
            {chats.map(chat => {
              const unreads = unreadsFor(chat, userId);
              const selected = chat.uuid === currentUuid;
              return (
                <ListItemButton
                  key={chat.id}
                  data-testid="chat-item"
                  onClick={() => onSelect(chat)}
                  sx={{ cursor: "pointer", pr: chat.ownerId === userId ? "84px" : undefined, ...(selected && { borderLeft: "6px solid #002d6e", bgcolor: "chatlist" }) }}
                >
                  <ListItemText
                    primary={
                      <>
                        {chat.title}
                        {unreads > 0 && <Chip size="small" sx={{ ml: "5px" }} label={unreads} color="secondary" />}
                      </>
                    }
                    secondary={secondaryText(chat)}
                  />
                  {chat.ownerId === userId && (
                    <Box sx={{ position: "absolute", right: 16 }} onClick={e => e.stopPropagation()}>
                      <IconButton edge="end" aria-label="edit chat" size="small" sx={{ mr: "5px" }} onClick={() => onEdit(chat)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete chat" size="small" onClick={() => setDeleting(chat)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Box>
    </>
  );
}
