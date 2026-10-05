import { Op } from "sequelize";
import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import { chatIncludes } from "../../helpers/ChatAccess";

interface ChatData {
  id: number;
  title?: string;
  userIds?: number[];
}

// Troca só quem entrou e quem saiu: antes apagava e recriava todos os
// participantes, zerando os não lidos de quem continuava.
export default async function UpdateService({ id, title, userIds }: ChatData): Promise<Chat> {
  const record = await Chat.findByPk(id, { include: [{ model: ChatUser, as: "users" }] });

  if (title !== undefined) await record.update({ title });

  if (userIds !== undefined) {
    const wanted = new Set([record.ownerId, ...userIds]);
    const current = new Set(record.users.map(chatUser => Number(chatUser.userId)));
    await ChatUser.destroy({
      where: { chatId: record.id, userId: { [Op.notIn]: [...wanted] } }
    });
    for (const userId of wanted) {
      if (!current.has(userId)) await ChatUser.create({ chatId: record.id, userId });
    }
  }

  await record.reload({ include: chatIncludes() });

  return record;
}
