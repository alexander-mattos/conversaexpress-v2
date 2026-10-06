"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { useAuth } from "@/contexts/AuthContext";
import { NO_FLAGS, effectiveFlags, type PlanFlags, type PlanStatus } from "@/lib/plan/planAccess";

interface PlanContextValue {
  flags: PlanFlags;
  status: PlanStatus;
  reload: () => void;
}

const PlanContext = createContext<PlanContextValue>({ flags: NO_FLAGS, status: "loading", reload: () => undefined });

// Espera entre tentativas (o backend pode estar reiniciando): cresce até 30s
// e não desiste; ao voltar para a aba, tenta na hora.
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000];
export const retryDelay = (tries: number): number => RETRY_DELAYS[Math.min(tries, RETRY_DELAYS.length - 1)];

// Recursos do plano da empresa (GET /companies/listPlan/:id), lidos uma vez e
// compartilhados entre o menu e as telas protegidas. Uma falha na consulta
// (ex.: backend reiniciando) é tentada de novo até dar certo e nunca vira
// "sem permissão".
export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const companyId = user?.companyId;
  const [state, setState] = useState<{ flags: PlanFlags; status: PlanStatus; companyId?: number }>({
    flags: NO_FLAGS,
    status: "loading"
  });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(n => n + 1), []);

  // Outra empresa (troca de usuário): volta a "carregando" durante o render,
  // sem efeito, para nenhuma tela usar o plano da sessão anterior.
  if (state.companyId !== companyId) {
    setState({ flags: NO_FLAGS, status: "loading", companyId });
  }

  useEffect(() => {
    if (!companyId) return undefined;
    let active = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    let loading = false;
    let done = false;
    const load = () => {
      if (!active || loading || done) return;
      if (retry) clearTimeout(retry);
      loading = true;
      api
        .get<{ plan: Partial<PlanFlags> | null }>(`/companies/listPlan/${companyId}`)
        .then(({ data }) => {
          done = true;
          if (active) setState({ flags: { ...NO_FLAGS, ...(data.plan ?? {}) }, status: "ready", companyId });
        })
        .catch(err => {
          if (!active) return;
          // Mantém o último plano válido; avisa uma vez e segue tentando.
          if (tries === 2) toastError(err);
          setState(current => (current.status === "ready" ? current : { ...current, status: "error", companyId }));
          retry = setTimeout(load, retryDelay(tries++));
        })
        .finally(() => {
          loading = false;
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [companyId, attempt]);

  const value = useMemo(
    () => ({ flags: effectiveFlags(state.flags, user?.super), status: user?.super ? "ready" as const : state.status, reload }),
    [state.flags, state.status, user?.super, reload]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = (): PlanContextValue => useContext(PlanContext);
