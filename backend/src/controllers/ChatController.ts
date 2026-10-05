import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";
import {
  assertChatOwner,
  chatIncludes,
  emitToChatMembers,
  loadChatForMember,
  parseChatUserIds
} from "../helpers/ChatAccess";

import CreateService from "../services/ChatService/CreateService";
import ListService from "../services/ChatService/ListService";
import ShowFromUuidService from "../services/ChatService/ShowFromUuidService";
import DeleteService from "../services/ChatService/DeleteService";
import FindMessages from "../services/ChatService/FindMessages";
import UpdateService from "../services/ChatService/UpdateService";
import CreateMessageService from "../services/ChatService/CreateMessageService";

import Chat from "../models/Chat";

type IndexQuery = {
  pageNumber: string;
};

const memberIds = (chat: Chat): number[] => (chat.users ?? []).map(chatUser => Number(chatUser.userId));

const emitChatUser = (companyId: number, chat: Chat, action: "create" | "update") => {
  const io = getIO();
  for (const userId of memberIds(chat)) {
    io.to(`user-${userId}`).emit(`company-${companyId}-chat-user-${userId}`, { action, record: chat });
  }
};

const parseTitle = (title: unknown): string => {
  const value = String(title ?? "").trim();
  if (!value) throw new AppError("ERR_CHAT_TITLE_REQUIRED", 400);
  return value.slice(0, 255);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber } = req.query as unknown as IndexQuery;

  const { records, count, hasMore } = await ListService({
    ownerId: +req.user.id,
    companyId: req.user.companyId,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const ownerId = +req.user.id;
  const title = parseTitle(req.body.title);
  const userIds = await parseChatUserIds(req.body.users, companyId);

  const record = await CreateService({ title, userIds, ownerId, companyId });
  emitChatUser(companyId, record, "create");

  return res.status(200).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const chat = await loadChatForMember(id, req.user);
  // Só o dono edita (antes qualquer usuário da empresa trocava título e membros).
  assertChatOwner(chat, req.user);
  const before = memberIds(chat);

  const record = await UpdateService({
    id: chat.id,
    title: req.body.title !== undefined ? parseTitle(req.body.title) : undefined,
    userIds: req.body.users !== undefined ? await parseChatUserIds(req.body.users, companyId) : undefined
  });

  emitChatUser(companyId, record, "update");
  const after = memberIds(record);
  const removed = before.filter(userId => !after.includes(userId));
  if (removed.length > 0) emitToChatMembers(companyId, removed, record.id, { action: "delete", id: record.id });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const found = await ShowFromUuidService(id);
  const record = await loadChatForMember(found.id, req.user);

  return res.status(200).json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const chat = await loadChatForMember(id, req.user);
  assertChatOwner(chat, req.user);
  const members = memberIds(chat);

  await DeleteService(String(chat.id));
  emitToChatMembers(companyId, members, chat.id, { action: "delete", id: chat.id });

  return res.status(200).json({ message: "Chat deleted" });
};

export const saveMessage = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const chat = await loadChatForMember(id, req.user);
  const message = String(req.body.message ?? "").trim();
  if (!message) throw new AppError("ERR_CHAT_MESSAGE_REQUIRED", 400);

  const newMessage = await CreateMessageService({
    chatId: chat.id,
    senderId: +req.user.id,
    message
  });

  const updated = await Chat.findByPk(chat.id, { include: chatIncludes() });
  emitToChatMembers(companyId, memberIds(updated), chat.id, {
    action: "new-message",
    newMessage,
    chat: updated
  });

  return res.json(newMessage);
};

export const checkAsRead = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const chat = await loadChatForMember(id, req.user);

  // Sempre o próprio usuário (antes o userId vinha do corpo).
  const chatUser = chat.users.find(item => Number(item.userId) === Number(req.user.id));
  await chatUser.update({ unreads: 0 });

  const updated = await Chat.findByPk(chat.id, { include: chatIncludes() });
  emitToChatMembers(companyId, [+req.user.id], chat.id, { action: "update", chat: updated });

  return res.json(updated);
};

export const messages = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber } = req.query as unknown as IndexQuery;
  const { id } = req.params;
  const chat = await loadChatForMember(id, req.user);

  const { records, count, hasMore } = await FindMessages({
    chatId: String(chat.id),
    ownerId: +req.user.id,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};
