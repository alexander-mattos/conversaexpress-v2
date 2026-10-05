"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, Button, Grid, Paper, Tab, Tabs, Typography, useMediaQuery, useTheme } from "@mui/material";
import ChatList from "@/components/chats/ChatList";
import ChatMessages from "@/components/chats/ChatMessages";
import ChatModal from "@/components/chats/ChatModal";
import { useAuth } from "@/contexts/AuthContext";
import { useChats } from "@/hooks/useChats";
import { api } from "@/lib/api";
import { applyChatEvent, type Chat } from "@/lib/chats/chats";
import { toastError } from "@/lib/toastError";

// Porta de frontend/src/pages/Chat (Chat Interno): lista + mensagens; no
// celular, em abas.
export default function ChatsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const desktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const params = useParams<{ uuid?: string[] }>();
  const currentUuid = params.uuid?.[0];
  const { user } = useAuth();
  const { chats, setChats, loadMore } = useChats(user?.companyId, user?.id);
  const [tab, setTab] = useState(currentUuid ? 1 : 0);
  const [modal, setModal] = useState<{ open: boolean; chat: Chat | null }>({ open: false, chat: null });
  const current = chats.find(chat => chat.uuid === currentUuid) ?? null;

  if (!user) return null;

  const select = (chat: Chat) => {
    setTab(1);
    router.push(`/chats/${chat.uuid}`);
  };

  const handleDelete = async (chat: Chat) => {
    try {
      await api.delete(`/chats/${chat.id}`);
      setChats(list => applyChatEvent(list, { action: "delete", id: chat.id }));
      // Só fecha para quem estava nele (antes qualquer exclusão na empresa
      // fechava o chat aberto de todos).
      if (chat.uuid === currentUuid) router.push("/chats");
    } catch (err) {
      toastError(err);
    }
  };

  const list = (
    <ChatList
      chats={chats}
      currentUuid={currentUuid}
      userId={user.id}
      onSelect={select}
      onEdit={chat => setModal({ open: true, chat })}
      onDelete={handleDelete}
      onLoadMore={loadMore}
    />
  );
  const newButton = (label: string) => (
    <Box sx={{ textAlign: "right", p: "10px" }}>
      <Button color="primary" variant="contained" onClick={() => setModal({ open: true, chat: null })}>
        {label}
      </Button>
    </Box>
  );
  const messages = current ? (
    <ChatMessages key={current.id} chat={current} companyId={user.companyId} userId={user.id} />
  ) : (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <Typography color="textSecondary">{t("chat.selectChat")}</Typography>
    </Box>
  );

  return (
    <>
      <ChatModal
        open={modal.open}
        chat={modal.chat}
        onClose={() => setModal({ open: false, chat: null })}
        onSaved={saved => {
          setChats(listState => applyChatEvent(listState, { action: "update", record: saved }));
          if (!modal.chat) select(saved);
        }}
      />
      <Paper
        sx={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          flex: 1,
          p: 2,
          height: "calc(100% - 48px)",
          overflowY: "hidden",
          border: "1px solid rgba(0, 0, 0, 0.12)"
        }}
      >
        {desktop ? (
          <Grid container sx={{ flex: 1, height: "100%", border: "1px solid rgba(0, 0, 0, 0.12)" }}>
            <Grid size={{ md: 3 }} sx={{ height: "100%" }}>
              {newButton(t("chat.buttons.new"))}
              {list}
            </Grid>
            <Grid size={{ md: 9 }} sx={{ height: "100%" }}>
              {messages}
            </Grid>
          </Grid>
        ) : (
          <Grid container sx={{ flex: 1, height: "100%", border: "1px solid rgba(0, 0, 0, 0.12)" }}>
            <Grid size={12}>
              <Tabs value={tab} indicatorColor="primary" textColor="primary" onChange={(_, value: number) => setTab(value)}>
                <Tab label={t("chat.chats")} />
                <Tab label={t("chat.messages")} />
              </Tabs>
            </Grid>
            <Grid size={12} sx={{ height: "92%", width: "100%" }}>
              {tab === 0 ? (
                <>
                  {newButton(t("chat.buttons.newChat"))}
                  {list}
                </>
              ) : (
                messages
              )}
            </Grid>
          </Grid>
        )}
      </Paper>
    </>
  );
}
