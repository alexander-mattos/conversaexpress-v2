import { Op } from "sequelize";
import Chat from "../../models/Chat";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

export interface ChatMessageData {
  senderId: number;
  chatId: number;
  message: string;
}

export default async function CreateMessageService({
  senderId,
  chatId,
  message
}: ChatMessageData) {
  const newMessage = await ChatMessage.create({
    senderId,
    chatId,
    message
  });

  await newMessage.reload({
    include: [
      { model: User, as: "sender", attributes: ["id", "name"] },
      {
        model: Chat,
        as: "chat",
        include: [{ model: ChatUser, as: "users" }]
      }
    ]
  });

  const sender = await User.findByPk(senderId, { attributes: ["id", "name"] });

  await newMessage.chat.update({ lastMessage: `${sender.name}: ${message}` });

  // Um update para cada grupo (antes um por participante, em sequência).
  await ChatUser.update({ unreads: 0 }, { where: { chatId, userId: senderId } });
  await ChatUser.increment("unreads", { where: { chatId, userId: { [Op.ne]: senderId } } });

  return newMessage;
}
