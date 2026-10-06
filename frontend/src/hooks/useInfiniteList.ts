"use client";

import { useCallback, useEffect, useReducer, useState, type UIEvent } from "react";
import { api } from "@/lib/api";
import { listReducer, type ListAction } from "@/lib/listReducer";
import { toastError } from "@/lib/toastError";

interface Options {
  url: string;
  // Nome da lista na resposta ({ contacts, hasMore }, { records, hasMore }...).
  key: string;
  searchParam: string;
  params?: Record<string, unknown>;
  // Busca todas as páginas de uma vez (ex.: calendário de agendamentos).
  all?: boolean;
  enabled?: boolean;
}

// Lista paginada com busca (500 ms), "carregar mais" a 100 px do fim e um
// dispatch para atualizações do socket. Trocar a busca recomeça da página 1.
export const useInfiniteList = <T extends { id: number | string }>({
  url,
  key,
  searchParam,
  params,
  all = false,
  enabled = true
}: Options) => {
  const [items, dispatch] = useReducer(listReducer<T>, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastSearch, setLastSearch] = useState(searchParam);
  const paramsKey = JSON.stringify(params ?? {});

  if (lastSearch !== searchParam) {
    setLastSearch(searchParam);
    setPageNumber(1);
    setLoading(true);
  }

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const extra = JSON.parse(paramsKey) as Record<string, unknown>;
        if (all) {
          const collected: T[] = [];
          for (let page = 1; ; page += 1) {
            const { data } = await api.get(url, { params: { ...extra, searchParam, pageNumber: page } });
            collected.push(...((data[key] as T[]) ?? []));
            if (!data.hasMore || !active) break;
          }
          if (!active) return;
          dispatch({ type: "RESET" });
          dispatch({ type: "LOAD", payload: collected });
          setHasMore(false);
        } else {
          const { data } = await api.get(url, { params: { ...extra, searchParam, pageNumber } });
          if (!active) return;
          if (pageNumber === 1) dispatch({ type: "RESET" });
          dispatch({ type: "LOAD", payload: (data[key] as T[]) ?? [] });
          setHasMore(!!data.hasMore);
        }
      } catch (err) {
        if (active) toastError(err);
      } finally {
        if (active) setLoading(false);
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [url, key, searchParam, pageNumber, paramsKey, all, enabled, reloadKey]);

  const handleScroll = (event: UIEvent<HTMLElement>) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      setLoading(true);
      setPageNumber(prev => prev + 1);
    }
  };

  // Recarrega da primeira página (após salvar em um modal, por exemplo).
  const reload = useCallback(() => {
    setLoading(true);
    setPageNumber(1);
    setReloadKey(prev => prev + 1);
  }, []);

  return { items, dispatch: dispatch as (action: ListAction<T>) => void, loading, hasMore, handleScroll, reload };
};
