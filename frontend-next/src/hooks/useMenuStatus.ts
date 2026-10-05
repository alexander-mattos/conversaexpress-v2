"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import type { User } from "@/contexts/AuthContext";

export interface PlanFlags {
  useCampaigns: boolean;
  useKanban: boolean;
  useOpenAi: boolean;
  useIntegrations: boolean;
  useSchedules: boolean;
  useInternalChat: boolean;
  useExternalApi: boolean;
}

const NO_FLAGS: PlanFlags = {
  useCampaigns: false,
  useKanban: false,
  useOpenAi: false,
  useIntegrations: false,
  useSchedules: false,
  useInternalChat: false,
  useExternalApi: false
};

// Recursos liberados pelo plano da empresa (GET /companies/listPlan/:id).
// "loaded" diferencia "ainda carregando" de "plano sem o recurso".
export const usePlanFlagsState = (user: User | null): { flags: PlanFlags; loaded: boolean } => {
  const [state, setState] = useState<{ flags: PlanFlags; loaded: boolean }>({ flags: NO_FLAGS, loaded: false });
  const companyId = user?.companyId;

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    api
      .get<{ plan: Partial<PlanFlags> }>(`/companies/listPlan/${companyId}`)
      .then(({ data }) => {
        if (active) setState({ flags: { ...NO_FLAGS, ...data.plan }, loaded: true });
      })
      .catch(err => {
        toastError(err);
        if (active) setState(current => ({ ...current, loaded: true }));
      });
    return () => {
      active = false;
    };
  }, [companyId]);

  return state;
};

export const usePlanFlags = (user: User | null): PlanFlags => usePlanFlagsState(user).flags;

export const useVersion = (): string => {
  const [version, setVersion] = useState("");
  useEffect(() => {
    api
      .get<{ version: string }>("/version")
      .then(({ data }) => setVersion(data.version))
      .catch(() => undefined);
  }, []);
  return version;
};

interface WhatsAppStatus {
  id: number;
  status: string;
}

const OFFLINE_STATUSES = ["qrcode", "PAIRING", "DISCONNECTED", "TIMEOUT", "OPENING"];

// Alerta "!" em Conexões quando alguma conexão não está conectada.
export const useConnectionWarning = (user: User | null, enabled: boolean): boolean => {
  const [whatsApps, setWhatsApps] = useState<WhatsAppStatus[]>([]);
  const [warning, setWarning] = useState(false);
  const companyId = user?.companyId;
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || !companyId) return undefined;
    api
      .get<WhatsAppStatus[]>("/whatsapp/?session=0")
      .then(({ data }) => setWhatsApps(data))
      .catch(toastError);

    const socket = socketManager.getSocket(companyId, userId);
    const upsert = (whatsapp: WhatsAppStatus) =>
      setWhatsApps(prev =>
        prev.some(w => w.id === whatsapp.id)
          ? prev.map(w => (w.id === whatsapp.id ? { ...w, ...whatsapp } : w))
          : [whatsapp, ...prev]
      );
    const onWhatsapp = (data: { action: string; whatsapp?: WhatsAppStatus; whatsappId?: number }) => {
      if (data.action === "update" && data.whatsapp) upsert(data.whatsapp);
      if (data.action === "delete") setWhatsApps(prev => prev.filter(w => w.id !== data.whatsappId));
    };
    const onSession = (data: { action: string; session?: WhatsAppStatus }) => {
      if (data.action === "update" && data.session) upsert(data.session);
    };
    socket.on(`company-${companyId}-whatsapp`, onWhatsapp);
    socket.on(`company-${companyId}-whatsappSession`, onSession);
    return () => {
      socket.off(`company-${companyId}-whatsapp`, onWhatsapp);
      socket.off(`company-${companyId}-whatsappSession`, onSession);
    };
  }, [enabled, companyId, userId]);

  useEffect(() => {
    // Mesma espera de 2s do menu atual, para não piscar durante reconexões.
    const timer = setTimeout(() => {
      setWarning(whatsApps.some(w => OFFLINE_STATUSES.includes(w.status)));
    }, 2000);
    return () => clearTimeout(timer);
  }, [whatsApps]);

  return warning;
};

interface Chat {
  id: number;
  users: { userId: number; unreads: number }[];
}

// Ponto no ícone do Chat Interno quando há mensagens não lidas.
export const useUnreadChats = (user: User | null): boolean => {
  const [chats, setChats] = useState<Chat[]>([]);
  const companyId = user?.companyId;
  const userId = user?.id;

  useEffect(() => {
    if (!companyId) return undefined;
    api
      .get<{ records: Chat[] }>("/chats/", { params: { searchParam: "", pageNumber: 1 } })
      .then(({ data }) => setChats(data.records ?? []))
      .catch(toastError);

    const socket = socketManager.getSocket(companyId, userId);
    const onChat = (data: { action: string; chat?: Chat }) => {
      if ((data.action === "new-message" || data.action === "update") && data.chat) {
        const changed = data.chat;
        setChats(prev => prev.map(c => (c.id === changed.id ? changed : c)));
      }
    };
    socket.on(`company-${companyId}-chat`, onChat);
    return () => socket.off(`company-${companyId}-chat`, onChat);
  }, [companyId, userId]);

  return chats.some(chat => chat.users?.some(u => u.userId === userId && u.unreads > 0));
};
