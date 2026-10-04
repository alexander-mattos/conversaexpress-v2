import { ModelCtor } from "sequelize-typescript";
import AppError from "../errors/AppError";
import User from "../models/User";

interface RequestUser {
  id: string | number;
  companyId: number;
}

export const isSameCompany = (
  recordCompanyId: number | string | null | undefined,
  companyId: number | string
): boolean =>
  recordCompanyId !== null &&
  recordCompanyId !== undefined &&
  Number(recordCompanyId) === Number(companyId);

export const isSuperUser = async (userId: string | number): Promise<boolean> => {
  const user = await User.findByPk(userId, { attributes: ["id", "super"] });
  return !!user?.super;
};

// Garante que o registro pertence à empresa de quem faz a requisição.
// Apenas o super admin pode acessar registros de outras empresas.
export const assertCompanyAccess = async (
  recordCompanyId: number | string | null | undefined,
  requestUser: RequestUser
): Promise<void> => {
  if (isSameCompany(recordCompanyId, requestUser.companyId)) return;
  if (await isSuperUser(requestUser.id)) return;

  throw new AppError("ERR_NO_PERMISSION", 403);
};

// Resolve o companyId a usar quando a requisição permite informar outra
// empresa (ex.: ?companyId=). Só o super admin pode escolher outra empresa.
export const resolveCompanyId = async (
  requestedCompanyId: number | string | null | undefined,
  requestUser: RequestUser
): Promise<number> => {
  if (
    requestedCompanyId === null ||
    requestedCompanyId === undefined ||
    requestedCompanyId === "" ||
    isSameCompany(requestedCompanyId, requestUser.companyId)
  ) {
    return requestUser.companyId;
  }

  if (await isSuperUser(requestUser.id)) return Number(requestedCompanyId);

  throw new AppError("ERR_NO_PERMISSION", 403);
};

// Carrega só o companyId do registro e confere a empresa. Se o registro não
// existir, deixa o serviço chamado em seguida responder com o 404 adequado.
export const assertRecordInCompany = async (
  model: ModelCtor,
  id: unknown,
  requestUser: RequestUser
): Promise<void> => {
  const record = await model.findByPk(id as string, {
    attributes: ["id", "companyId"]
  });
  if (!record) return;
  await assertCompanyAccess(record.get("companyId") as number, requestUser);
};
