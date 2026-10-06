"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/rules";
import { usePlanFlagsState, type PlanFlags } from "./useMenuStatus";

// Telas de admin liberadas pelo plano (Open.Ai, Integrações): como no
// frontend atual, sem o recurso no plano volta para o início. Também exige
// admin, igual ao menu (e à API), menos onde o menu mostra para todos
// (Kanban: adminOnly false).
export const usePlanGuard = (flag: keyof PlanFlags, { adminOnly = true }: { adminOnly?: boolean } = {}): boolean => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { flags, loaded } = usePlanFlagsState(user);
  const allowed = loaded && flags[flag] && (!adminOnly || can(user?.profile, "drawer-admin-items:view"));

  useEffect(() => {
    if (loaded && !allowed) {
      toast.error(t("backendErrors.ERR_NO_PERMISSION"));
      router.replace("/");
    }
  }, [loaded, allowed, router, t]);

  return allowed;
};

// Campanhas: liberadas pelo plano ou pela configuração campaignsEnabled da
// empresa, para todos os perfis (igual ao menu e à API).
export const useCampaignsGuard = (): boolean => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, campaignsEnabled } = useAuth();
  const { flags, loaded } = usePlanFlagsState(user);
  const allowed = loaded && (flags.useCampaigns || campaignsEnabled);

  useEffect(() => {
    if (loaded && !allowed) {
      toast.error(t("backendErrors.ERR_NO_PERMISSION"));
      router.replace("/");
    }
  }, [loaded, allowed, router, t]);

  return allowed;
};
