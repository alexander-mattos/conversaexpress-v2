"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";
import { planGuardDecision, type GuardDecision, type PlanFlags } from "@/lib/plan/planAccess";

// Sem permissão, avisa e volta para o início. "wait" (plano carregando ou
// consulta com erro) só espera: nunca é tratado como falta de permissão.
const useGuardRedirect = (decision: GuardDecision): boolean => {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (decision === "deny") {
      toast.error(t("backendErrors.ERR_NO_PERMISSION"));
      router.replace("/");
    }
  }, [decision, router, t]);

  return decision === "allow";
};

// Telas de admin liberadas pelo plano (API, Open.Ai, Integrações): sem o
// recurso no plano volta para o início. Também exige admin, igual ao menu (e
// à API), menos onde o menu mostra para todos (Kanban: adminOnly false).
// O super acessa tudo.
export const usePlanGuard = (flag: keyof PlanFlags, { adminOnly = true }: { adminOnly?: boolean } = {}): boolean => {
  const { user } = useAuth();
  const { flags, status } = usePlan();
  return useGuardRedirect(
    planGuardDecision({ status, allowedByPlan: flags[flag], profile: user?.profile, isSuper: user?.super, adminOnly })
  );
};

// Campanhas: liberadas pelo plano ou pela configuração campaignsEnabled da
// empresa, para todos os perfis (igual ao menu e à API).
export const useCampaignsGuard = (): boolean => {
  const { user, campaignsEnabled } = useAuth();
  const { flags, status } = usePlan();
  return useGuardRedirect(
    planGuardDecision({
      status: campaignsEnabled ? "ready" : status,
      allowedByPlan: flags.useCampaigns || campaignsEnabled,
      profile: user?.profile,
      isSuper: user?.super,
      adminOnly: false
    })
  );
};
