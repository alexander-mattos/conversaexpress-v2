"use client";

import { useEffect, useReducer, useState } from "react";
import { api } from "@/lib/api";
import { listReducer } from "@/lib/listReducer";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

export interface WhatsApp {
  id: number;
  name: string;
  status: string;
  isDefault: boolean;
  updatedAt?: string;
  qrcode?: string;
}

// Porta de frontend/src/hooks/useWhatsApps: lista de conexões com as
// atualizações de conexão e de sessão (status e QR) pelo socket.
export const useWhatsApps = (companyId?: number, userId?: number) => {
  const [whatsApps, dispatch] = useReducer(listReducer<WhatsApp>, []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return undefined;
    let active = true;
    api
      .get<WhatsApp[]>("/whatsapp/", { params: { session: 0 } })
      .then(({ data }) => {
        if (!active) return;
        dispatch({ type: "RESET" });
        dispatch({ type: "LOAD", payload: data });
      })
      .catch(toastError)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-whatsapp`, (data: { action: string; whatsapp?: WhatsApp; whatsappId?: number }) => {
      if (data.action === "update" && data.whatsapp) dispatch({ type: "UPSERT", payload: data.whatsapp });
      if (data.action === "delete" && data.whatsappId) dispatch({ type: "DELETE", payload: +data.whatsappId });
    });
    socket.on(`company-${companyId}-whatsappSession`, (data: { action: string; session?: WhatsApp }) => {
      if (data.action === "update" && data.session) dispatch({ type: "PATCH", payload: data.session });
    });
    return () => socket.disconnect();
  }, [companyId, userId]);

  return { whatsApps, loading };
};
