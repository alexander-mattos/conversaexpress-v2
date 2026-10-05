import { Op } from "sequelize";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";
import Chat from "../models/Chat";
import ChatUser from "../models/ChatUser";
import User from "../models/User";

// Só id e nome dos usuários: antes o include trazia o usuário inteiro
// (inclusive o hash da senha) para todos os participantes.
export const CHAT_USER_ATTRIBUTES = ["id", "name"];

export const chatIncludes = () => [
  { model: User, as: "owner", attributes: CHAT_USER_ATTRIBUTES },
  {
    model: ChatUser,
    as: "users",
    include: [{ model: User, as: "user", attributes: CHAT_USER_ATTRIBUTES }]
  }
];

interface RequestUser {
  id: string | number;
  companyId: number;
}

// O chat precisa existir, ser da empresa e ter o usuário como participante.
export const loadChatForMember = async (id: string | number, user: RequestUser): Promise<Chat> => {
  const chat = await Chat.findByPk(id, { include: chatIncludes() });
  if (!chat) throw new AppError("ERR_NO_CHAT_FOUND", 404);
  const member = chat.users?.some(chatUser => Number(chatUser.userId) === Number(user.id));
  if (Number(chat.companyId) !== Number(user.companyId) || !member) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return chat;
};

export const assertChatOwner = (chat: Chat, user: RequestUser): void => {
  if (Number(chat.ownerId) !== Number(user.id)) throw new AppError("ERR_NO_PERMISSION", 403);
};

// Participantes: ids únicos, todos da empresa.
export const parseChatUserIds = async (users: unknown, companyId: number): Promise<number[]> => {
  if (users === undefined || users === null) return [];
  if (!Array.isArray(users)) throw new AppError("ERR_INVALID_CHAT_USERS", 400);
  const ids = [...new Set(users.map(item => Number(typeof item === "object" ? item?.id : item)))];
  if (ids.some(id => !Number.isInteger(id))) throw new AppError("ERR_INVALID_CHAT_USERS", 400);
  if (ids.length > 0) {
    const count = await User.count({ where: { id: { [Op.in]: ids }, companyId } });
    if (count !== ids.length) throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return ids;
};

// Eventos do chat só para os participantes (sala de cada usuário). Antes
// iam para a empresa inteira, com o texto das mensagens.
export const emitToChatMembers = (
  companyId: number,
  userIds: number[],
  chatId: number,
  payload: Record<string, unknown>
): void => {
  const io = getIO();
  for (const userId of new Set(userIds)) {
    io.to(`user-${userId}`).emit(`company-${companyId}-chat`, payload);
    io.to(`user-${userId}`).emit(`company-${companyId}-chat-${chatId}`, payload);
  }
};
