import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";

export const USER_PROFILES = ["admin", "user", "supervisor"];

// Perfil, filas e conexão de um usuário: o perfil precisa ser conhecido e as
// filas e a conexão precisam ser da empresa do usuário.
export const assertUserRefs = async (
  { profile, queueIds, whatsappId }: { profile?: unknown; queueIds?: unknown; whatsappId?: unknown },
  companyId: number
): Promise<void> => {
  if (profile !== undefined && !USER_PROFILES.includes(String(profile))) {
    throw new AppError("ERR_INVALID_PROFILE", 400);
  }
  if (queueIds !== undefined && queueIds !== null) {
    if (!Array.isArray(queueIds)) throw new AppError("ERR_INVALID_QUEUES", 400);
    const ids = [...new Set(queueIds.map(Number))];
    if (ids.some(id => !Number.isInteger(id))) throw new AppError("ERR_INVALID_QUEUES", 400);
    if (ids.length > 0) {
      const count = await Queue.count({ where: { id: { [Op.in]: ids }, companyId } });
      if (count !== ids.length) throw new AppError("ERR_NO_PERMISSION", 403);
    }
  }
  if (whatsappId) {
    const whatsapp = await Whatsapp.findByPk(whatsappId as string, { attributes: ["id", "companyId"] });
    if (!whatsapp || Number(whatsapp.companyId) !== Number(companyId)) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
  }
};

// A empresa precisa continuar com pelo menos um admin.
export const assertNotLastAdmin = async (user: User): Promise<void> => {
  if (user.profile !== "admin") return;
  const admins = await User.count({
    where: { companyId: user.companyId, profile: "admin", id: { [Op.ne]: user.id } }
  });
  if (admins === 0) throw new AppError("ERR_LAST_ADMIN", 400);
};
