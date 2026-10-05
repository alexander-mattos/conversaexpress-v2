import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CheckSettingsHelper from "../helpers/CheckSettings";
import AppError from "../errors/AppError";
import { assertCompanyAccess, resolveCompanyId } from "../helpers/CompanyAccess";

import CreateUserService from "../services/UserServices/CreateUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import SimpleListService from "../services/UserServices/SimpleListService";
import User from "../models/User";
import SetLanguageCompanyService from "../services/UserServices/SetLanguageCompanyService";
import { assertNotLastAdmin, assertUserRefs } from "../helpers/UserRefs";
import UpdateMeService from "../services/UserServices/UpdateMeService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type ListQueryParams = {
  companyId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId, profile } = req.user;

  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber,
    companyId,
    profile
  });

  return res.json({ users, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    email,
    password,
    name,
    profile,
    companyId: bodyCompanyId,
    queueIds,
    whatsappId,
	allTicket
  } = req.body;
  let userCompanyId: number | null = null;

  let requestUser: User = null;

  if (req.user !== undefined) {
    const { companyId: cId } = req.user;
    userCompanyId = cId;
    requestUser = await User.findByPk(req.user.id);
  }

  const newUserCompanyId = bodyCompanyId || userCompanyId;

  if (req.url === "/signup") {
    if (await CheckSettingsHelper("userCreation") === "disabled") {
      throw new AppError("ERR_USER_CREATION_DISABLED", 403);
    }
  } else if (req.user?.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  } else if (newUserCompanyId !== req.user?.companyId && !requestUser?.super) {
    throw new AppError("ERR_NO_SUPER", 403);
  }

  await assertUserRefs({ profile, queueIds, whatsappId }, newUserCompanyId);

  const user = await CreateUserService({
    email,
    password,
    name,
    profile,
    companyId: newUserCompanyId,
    queueIds,
    whatsappId,
	allTicket
  });

  const io = getIO();
  io.to(`company-${userCompanyId}-mainchannel`).emit(`company-${userCompanyId}-user`, {
    action: "create",
    user
  });

  return res.status(200).json(user);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;

  const user = await ShowUserService(userId);
  await assertCompanyAccess(user.companyId, req.user);

  // tokenVersion é interno (invalida sessões); não sai na resposta.
  const { tokenVersion, ...data } = user.toJSON() as Record<string, unknown>;
  return res.status(200).json(data);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { id: requestUserId, companyId } = req.user;
  const { userId } = req.params;
  const userData = req.body;

  const target = await ShowUserService(userId);
  await assertUserRefs(
    { profile: userData.profile, queueIds: userData.queueIds, whatsappId: userData.whatsappId },
    target.companyId
  );
  if (userData.profile !== undefined && userData.profile !== "admin") {
    await assertNotLastAdmin(target);
  }

  const user = await UpdateUserService({
    userData,
    userId,
    companyId,
    requestUserId: +requestUserId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-user`, {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { companyId } = req.user;

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (Number(userId) === Number(req.user.id)) {
    throw new AppError("ERR_CANNOT_DELETE_SELF", 400);
  }
  const target = await ShowUserService(userId);
  if (target.companyId === companyId) await assertNotLastAdmin(target);

  await DeleteUserService(userId, companyId, req.user.id);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-user`, {
    action: "delete",
    userId
  });

  return res.status(200).json({ message: "User deleted" });
};

// Perfil do próprio usuário (menu da conta): só nome, e-mail e senha.
export const updateMe = async (req: Request, res: Response): Promise<Response> => {
  const { id, companyId } = req.user;
  const { name, email, password } = req.body;

  const user = await UpdateMeService({ userId: id, name, email, password });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-user`, {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.query;

  const users = await SimpleListService({
    companyId: await resolveCompanyId(companyId as string, req.user)
  });

  return res.status(200).json(users);
};

export const setLanguage = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {newLanguage} = req.params;

  if (newLanguage !== "pt" && newLanguage !== "en" && newLanguage !== "es") {
    throw new AppError("ERR_INVALID_LANGUAGE", 400);
  }

  await SetLanguageCompanyService( companyId, newLanguage );

  return res.status(200).json({message: "Language updated successfully"});
}
