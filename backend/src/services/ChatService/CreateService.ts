import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import { chatIncludes } from "../../helpers/ChatAccess";

interface Data {
  ownerId: number;
  companyId: number;
  userIds: number[];
  title: string;
}

// O dono sempre participa, uma vez só (antes ficava duplicado se estivesse na
// lista, ou de fora se a lista viesse vazia).
const CreateService = async ({ ownerId, companyId, userIds, title }: Data): Promise<Chat> => {
  const record = await Chat.create({ ownerId, companyId, title });

  for (const userId of new Set([ownerId, ...userIds])) {
    await ChatUser.create({ chatId: record.id, userId });
  }

  await record.reload({ include: chatIncludes() });

  return record;
};

export default CreateService;
