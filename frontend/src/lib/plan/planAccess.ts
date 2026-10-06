import { can } from "@/lib/rules";

export interface PlanFlags {
  useCampaigns: boolean;
  useKanban: boolean;
  useOpenAi: boolean;
  useIntegrations: boolean;
  useSchedules: boolean;
  useInternalChat: boolean;
  useExternalApi: boolean;
}

export const NO_FLAGS: PlanFlags = {
  useCampaigns: false,
  useKanban: false,
  useOpenAi: false,
  useIntegrations: false,
  useSchedules: false,
  useInternalChat: false,
  useExternalApi: false
};

export const ALL_FLAGS: PlanFlags = {
  useCampaigns: true,
  useKanban: true,
  useOpenAi: true,
  useIntegrations: true,
  useSchedules: true,
  useInternalChat: true,
  useExternalApi: true
};

// "loading": ainda sem resposta; "error": a consulta falhou (não é o mesmo
// que "o plano não tem o recurso" e nunca deve bloquear a tela por isso).
export type PlanStatus = "loading" | "ready" | "error";

// O super acessa todos os recursos, qualquer que seja o plano da empresa.
export const effectiveFlags = (flags: PlanFlags, isSuper: boolean | undefined): PlanFlags =>
  isSuper ? ALL_FLAGS : flags;

export type GuardDecision = "wait" | "allow" | "deny";

// Decide o que a tela protegida faz: esperar o plano, abrir ou voltar ao início.
export const planGuardDecision = ({
  status,
  allowedByPlan,
  profile,
  isSuper,
  adminOnly
}: {
  status: PlanStatus;
  allowedByPlan: boolean;
  profile: string | undefined;
  isSuper?: boolean;
  adminOnly: boolean;
}): GuardDecision => {
  if (adminOnly && !isSuper && !can(profile, "drawer-admin-items:view")) return "deny";
  if (isSuper) return "allow";
  if (status !== "ready") return "wait";
  return allowedByPlan ? "allow" : "deny";
};
