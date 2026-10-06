import { Op, WhereOptions } from "sequelize";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Plan from "../models/Plan";
import UserQueue from "../models/UserQueue";

type PlanFeature =
  | "useKanban"
  | "useCampaigns"
  | "useSchedules"
  | "useInternalChat"
  | "useExternalApi"
  | "useOpenAi"
  | "useIntegrations";

interface RequestUser {
  id: string | number;
  profile: string;
  companyId: number;
}

interface VisibleTicket {
  userId?: number | null;
  status: string;
  queueId?: number | null;
}

// O recurso precisa estar liberado no plano da empresa (antes a tela só
// escondia o menu e a API respondia normalmente).
export const assertPlanFeature = async (companyId: number, feature: PlanFeature): Promise<void> => {
  const company = await Company.findByPk(companyId, {
    attributes: ["id"],
    include: [{ model: Plan, as: "plan", attributes: [feature] }]
  });
  if (!company?.plan?.[feature]) throw new AppError("ERR_PLAN_FEATURE_DISABLED", 403);
};

export const userQueueIds = async (userId: string | number): Promise<number[]> => {
  const rows = await UserQueue.findAll({ where: { userId }, attributes: ["queueId"] });
  return rows.map(row => Number(row.queueId));
};

// Lista de ids vinda da query (JSON "[1,2]"); qualquer outra coisa é 400.
export const parseIdList = (value: unknown): number[] => {
  if (value === undefined || value === null || value === "") return [];
  let parsed: unknown;
  try {
    parsed = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new AppError("ERR_INVALID_FILTER", 400);
  }
  if (!Array.isArray(parsed)) throw new AppError("ERR_INVALID_FILTER", 400);
  const ids = parsed.map(Number);
  if (ids.some(id => !Number.isInteger(id) || id <= 0)) throw new AppError("ERR_INVALID_FILTER", 400);
  return [...new Set(ids)];
};

// Filas que o usuário pode ver no Kanban: as dele, opcionalmente reduzidas
// às pedidas na query (nunca ampliadas por ela).
export const allowedQueueIds = (own: number[], requested: number[]): number[] =>
  requested.length > 0 ? requested.filter(id => own.includes(id)) : own;

// Mesma regra da lista: os tickets do próprio usuário e os pendentes das
// filas dele (ou sem fila).
export const visibleTicketsWhere = (userId: string | number, queueIds: number[]): WhereOptions => ({
  [Op.or]: [
    { userId },
    {
      status: "pending",
      [Op.or]: [{ queueId: { [Op.in]: queueIds } }, { queueId: null }]
    }
  ]
});

export const canSeeTicket = (ticket: VisibleTicket, user: RequestUser, queueIds: number[]): boolean => {
  if (user.profile === "admin") return true;
  if (ticket.userId !== null && ticket.userId !== undefined && Number(ticket.userId) === Number(user.id)) {
    return true;
  }
  if (ticket.status !== "pending") return false;
  return ticket.queueId === null || ticket.queueId === undefined || queueIds.includes(Number(ticket.queueId));
};

export const assertCanSeeTicket = async (ticket: VisibleTicket, user: RequestUser): Promise<void> => {
  if (user.profile === "admin") return;
  const queueIds = await userQueueIds(user.id);
  if (!canSeeTicket(ticket, user, queueIds)) throw new AppError("ERR_NO_PERMISSION", 403);
};
