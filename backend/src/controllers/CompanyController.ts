import * as Yup from "yup";
import { Request, Response } from "express";
// import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import { parseQueueSchedules } from "../helpers/QueueSchedules";
import { assertCompanyAccess } from "../helpers/CompanyAccess";
import { parseDocument } from "../helpers/CpfCnpj";
import { whatsappNumber } from "../helpers/WelcomeMessage";
import SendWelcomeService from "../services/CompanyService/SendWelcomeService";
import Company from "../models/Company";
import authConfig from "../config/auth";

import ListCompaniesService from "../services/CompanyService/ListCompaniesService";
import CreateCompanyService from "../services/CompanyService/CreateCompanyService";
import UpdateCompanyService from "../services/CompanyService/UpdateCompanyService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import UpdateSchedulesService from "../services/CompanyService/UpdateSchedulesService";
import DeleteCompanyService from "../services/CompanyService/DeleteCompanyService";
import FindAllCompaniesService from "../services/CompanyService/FindAllCompaniesService";
import { verify } from "jsonwebtoken";
import User from "../models/User";
import Plan from "../models/Plan";
import ShowPlanCompanyService from "../services/CompanyService/ShowPlanCompanyService";
import ListCompaniesPlanService from "../services/CompanyService/ListCompaniesPlanService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type CompanyData = {
  name: string;
  id?: number;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: string;
  recurrence?: string;
  document?: string | null;
  password: string;
};

type SchedulesData = {
  schedules: [];
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { companies, count, hasMore } = await ListCompaniesService({
    searchParam,
    pageNumber
  });

  return res.json({ companies, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newCompany: CompanyData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(newCompany);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { company, generatedPassword } = await CreateCompanyService({
    ...newCompany,
    document: parseDocument(newCompany.document)
  });

  // Sem await: as boas-vindas não atrasam nem derrubam o cadastro.
  Plan.findByPk(company.planId)
    .then(plan => SendWelcomeService({ company, plan, password: generatedPassword }))
    .catch(() => undefined);

  return res.status(200).json({ ...company.toJSON(), generatedPassword });
};

// Período de teste do cadastro público (antes calculado no navegador).
const SIGNUP_TRIAL_DAYS = Number(process.env.SIGNUP_TRIAL_DAYS || 7);

// Cadastro público: só aceita os dados do formulário. Plano é validado e
// vencimento, status e recorrência são definidos pelo servidor.
export const signup = async (req: Request, res: Response): Promise<Response> => {
  const { name, email, phone, password, planId } = req.body;
  // CPF/CNPJ obrigatório: o Asaas só cobra clientes com documento.
  const document = parseDocument(req.body.document, true);
  // Telefone obrigatório: as boas-vindas também vão por WhatsApp.
  if (!whatsappNumber(phone)) {
    throw new AppError("ERR_INVALID_PHONE", 400);
  }

  const schema = Yup.object().shape({
    name: Yup.string().min(2).max(50).required(),
    email: Yup.string().email().required(),
    password: Yup.string().min(8).max(50).required(),
    planId: Yup.number().integer().positive().required()
  });

  try {
    await schema.validate({ name, email, password, planId });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 400);
  }

  const emailInUse = await User.findOne({ where: { email } });
  if (emailInUse) {
    throw new AppError("ERR_EMAIL_ALREADY_EXISTS", 400);
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + SIGNUP_TRIAL_DAYS);

  const { company } = await CreateCompanyService({
    name,
    email,
    phone,
    password,
    document,
    planId: plan.id,
    status: true,
    campaignsEnabled: true,
    recurrence: "MENSAL",
    dueDate: dueDate.toISOString()
  });

  SendWelcomeService({ company, plan }).catch(() => undefined);

  return res.status(200).json({ id: company.id, name: company.name });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  await assertCompanyAccess(id, req.user);

  const company = await ShowCompanyService(id);

  return res.status(200).json(company);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const companies: Company[] = await FindAllCompaniesService();

  return res.status(200).json(companies);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyData: CompanyData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string()
  });

  try {
    await schema.validate(companyData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const company = await UpdateCompanyService({
    id,
    ...companyData,
    document: parseDocument(companyData.document)
  });

  return res.status(200).json(company);
};

export const updateSchedules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { schedules }: SchedulesData = req.body;
  const { id } = req.params;
  await assertCompanyAccess(id, req.user);

  // Só admin (na rota) e com horários válidos: antes qualquer perfil
  // regravava o expediente da empresa com o que viesse.
  const company = await UpdateSchedulesService({
    id,
    schedules: parseQueueSchedules(schedules) ?? []
  });

  return res.status(200).json(company);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  const company = await DeleteCompanyService(id);

  return res.status(200).json(company);
};

export const listPlan = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { id: requestUserId, profile, companyId } = decoded as TokenPayload;
  const requestUser = await User.findByPk(requestUserId);

  if (requestUser.super === true) {
    const company = await ShowPlanCompanyService(id);
    return res.status(200).json(company);
  } else if (companyId.toString() !== id) {
    return res.status(400).json({ error: "Você não possui permissão para acessar este recurso!" });
  } else {
    const company = await ShowPlanCompanyService(id);
    return res.status(200).json(company);
  }

};

export const indexPlan = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { id, profile, companyId } = decoded as TokenPayload;
  // const company = await Company.findByPk(companyId);
  const requestUser = await User.findByPk(id);

  if (requestUser.super === true) {
    const companies = await ListCompaniesPlanService();
    return res.json({ companies });
  } else {
    return res.status(400).json({ error: "Você não possui permissão para acessar este recurso!" });
  }

};