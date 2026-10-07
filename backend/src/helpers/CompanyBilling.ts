import Invoices from "../models/Invoices";

// A empresa está no período de teste enquanto não tiver nenhuma fatura paga.
export const isCompanyInTrial = async (companyId: number): Promise<boolean> => {
  if (!companyId) return false;
  const paid = await Invoices.count({ where: { companyId, status: "paid" } });
  return paid === 0;
};

// Acrescenta "trial" ao company do usuário devolvido no login e no refresh.
export const withTrialFlag = async <T extends { companyId: number; company?: any }>(user: T): Promise<T> => {
  if (!user?.company) return user;
  const company = typeof user.company.toJSON === "function" ? user.company.toJSON() : { ...user.company };
  return { ...user, company: { ...company, trial: await isCompanyInTrial(user.companyId) } };
};
