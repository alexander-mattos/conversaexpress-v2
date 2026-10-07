"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { differenceInCalendarDays, format, isBefore } from "date-fns";
import { api, refreshSession, setAccessToken, setOnSessionExpired } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { TRIAL_DISMISS_KEY } from "@/lib/billing/trial";
import { i18n } from "@/i18n";

export interface Queue {
  id: number;
  name: string;
  color: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  profile: "admin" | "user" | string;
  companyId: number;
  super: boolean;
  allTicket?: string;
  whatsappId?: number | null;
  queues: Queue[];
  company?: { id: number; name: string; dueDate?: string; trial?: boolean; settings?: Setting[] } | null;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthValue {
  user: User | null;
  isAuth: boolean;
  loading: boolean;
  campaignsEnabled: boolean;
  handleLogin: (data: LoginData) => Promise<void>;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export const useAuth = (): AuthValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth fora do AuthProvider");
  return value;
};

const isCampaignsEnabled = (settings?: Setting[]): boolean =>
  !!settings?.some(s => s.key === "campaignsEnabled" && (s.value === "true" || s.value === "enabled"));

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignsEnabled, setCampaignsEnabled] = useState(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    socketManager.close();
    setUser(null);
    setCampaignsEnabled(false);
  }, []);

  // A flag de campanhas vinha do localStorage ("cshow"); agora vem das
  // configurações da empresa, inclusive depois de recarregar a página.
  const loadCampaignsFlag = useCallback(async () => {
    try {
      const { data } = await api.get<Setting[]>("/settings");
      setCampaignsEnabled(isCampaignsEnabled(data));
    } catch {
      setCampaignsEnabled(false);
    }
  }, []);

  // Ao abrir/recarregar: renova a sessão pelo cookie httpOnly de refresh.
  useEffect(() => {
    setOnSessionExpired(() => {
      clearSession();
      router.replace("/login");
    });
    (async () => {
      try {
        const { user: sessionUser } = await refreshSession<User>();
        setUser(sessionUser);
        await loadCampaignsFlag();
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
    return () => setOnSessionExpired(null);
  }, [clearSession, loadCampaignsFlag, router]);

  // Atualizações do próprio usuário em tempo real (mesmo evento de hoje).
  useEffect(() => {
    if (!user) return undefined;
    const socket = socketManager.getSocket(user.companyId, user.id);
    const onUser = (data: { action: string; user: User }) => {
      if (data.action === "update" && data.user.id === user.id) setUser(prev => ({ ...prev, ...data.user }));
    };
    socket.on(`company-${user.companyId}-user`, onUser);
    return () => socket.off(`company-${user.companyId}-user`, onUser);
  }, [user]);

  const handleLogin = useCallback(
    async (credentials: LoginData) => {
      setLoading(true);
      try {
        const { data } = await api.post<{ token: string; user: User }>("/auth/login", credentials);
        const dueDate = data.user.company?.dueDate;
        const due = dueDate ? new Date(dueDate) : null;

        // Assinatura vencida: não entra (mesma regra do frontend atual).
        if (due && !isBefore(new Date(), due)) {
          toastError(
            `Opss! Sua assinatura venceu ${format(due, "dd/MM/yyyy")}.\nEntre em contato com o Suporte para mais informações!`
          );
          return;
        }

        setAccessToken(data.token);
        setUser(data.user);
        setCampaignsEnabled(isCampaignsEnabled(data.user.company?.settings));
        toast.success(i18n.t("auth.toasts.success"));

        // Novo login mostra de novo o aviso de teste, mesmo se fechado antes.
        try {
          sessionStorage.removeItem(TRIAL_DISMISS_KEY);
        } catch {
          // sem sessionStorage
        }
        // No teste, o aviso fixo no header substitui o toast de vencimento.
        if (due && !data.user.company?.trial) {
          const days = differenceInCalendarDays(due, new Date());
          if (days < 5) toast.warn(`Sua assinatura vence em ${days} ${days === 1 ? "dia" : "dias"} `);
        }
        router.push("/tickets");
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      await api.delete("/auth/logout");
    } catch (err) {
      toastError(err);
    } finally {
      clearSession();
      setLoading(false);
      router.push("/login");
    }
  }, [clearSession, router]);

  const value = useMemo(
    () => ({ user, isAuth: !!user, loading, campaignsEnabled, handleLogin, handleLogout }),
    [user, loading, campaignsEnabled, handleLogin, handleLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
