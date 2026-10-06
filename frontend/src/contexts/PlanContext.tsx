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

const RETRY_DELAYS = [1000, 3000, 8000];

// Recursos do plano da empresa (GET /companies/listPlan/:id), lidos uma vez e
// compartilhados entre o menu e as telas protegidas. Uma falha na consulta é
// tentada de novo e nunca vira "sem permissão".
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
    const load = (tries: number) => {
      api
        .get<{ plan: Partial<PlanFlags> | null }>(`/companies/listPlan/${companyId}`)
        .then(({ data }) => {
          if (active) setState({ flags: { ...NO_FLAGS, ...(data.plan ?? {}) }, status: "ready", companyId });
        })
        .catch(err => {
          if (!active) return;
          if (tries < RETRY_DELAYS.length) {
            retry = setTimeout(() => load(tries + 1), RETRY_DELAYS[tries]);
            return;
          }
          toastError(err);
          setState(current => ({ ...current, status: "error", companyId }));
        });
    };
    load(0);
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
    };
  }, [companyId, attempt]);

  const value = useMemo(
    () => ({ flags: effectiveFlags(state.flags, user?.super), status: user?.super ? "ready" as const : state.status, reload }),
    [state.flags, state.status, user?.super, reload]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = (): PlanContextValue => useContext(PlanContext);
