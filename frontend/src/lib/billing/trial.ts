import { differenceInCalendarDays } from "date-fns";

export interface TrialInfo {
  days: number;
  lastDay: boolean;
  dueDate: Date;
}

// Aviso de teste: só para admin, só enquanto a empresa está no teste
// (nenhuma fatura paga) e antes do vencimento. Último dia = vence hoje.
export const trialInfo = (
  user: { profile?: string; super?: boolean; company?: { dueDate?: string | null; trial?: boolean } | null } | null,
  now = new Date()
): TrialInfo | null => {
  if (!user || user.profile !== "admin" || user.super) return null;
  const company = user.company;
  if (!company?.trial || !company.dueDate) return null;
  const dueDate = new Date(company.dueDate);
  if (Number.isNaN(dueDate.getTime()) || dueDate <= now) return null;
  const days = differenceInCalendarDays(dueDate, now);
  return { days, lastDay: days <= 0, dueDate };
};

// Fechar o aviso vale até o próximo login (sessionStorage, limpo no login).
export const TRIAL_DISMISS_KEY = "trialBannerDismissed";
