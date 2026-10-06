"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { applyChatEvent, type Chat, type ChatEvent } from "@/lib/chats/chats";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

// Lista de chats do usuário (paginada) com as atualizações do socket. Os
// eventos do chat agora só chegam a quem participa.
export const useChats = (companyId?: number, userId?: number) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!companyId) return undefined;
    let active = true;
    api
      .get<{ records: Chat[]; hasMore: boolean }>("/chats/", { params: { pageNumber: page } })
      .then(({ data }) => {
        if (!active) return;
        setChats(current => {
          const base = page === 1 ? [] : current;
          const known = new Set(base.map(chat => chat.id));
          return [...base, ...data.records.filter(chat => !known.has(chat.id))];
        });
        setHasMore(data.hasMore);
      })
      .catch(err => active && toastError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [companyId, page, reloadKey]);

  useEffect(() => {
    if (!companyId || !userId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    const onEvent = (event: ChatEvent) => setChats(current => applyChatEvent(current, event));
    socket.on(`company-${companyId}-chat`, onEvent);
    socket.on(`company-${companyId}-chat-user-${userId}`, onEvent);
    return () => {
      socket.off(`company-${companyId}-chat`, onEvent);
      socket.off(`company-${companyId}-chat-user-${userId}`, onEvent);
    };
  }, [companyId, userId]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setLoading(true);
    setPage(current => current + 1);
  }, [hasMore, loading]);

  const reload = useCallback(() => {
    setPage(1);
    setReloadKey(key => key + 1);
  }, []);

  return { chats, setChats, hasMore, loading, loadMore, reload };
};
