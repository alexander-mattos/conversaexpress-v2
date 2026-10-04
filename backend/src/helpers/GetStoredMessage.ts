import { proto, WAMessageKey } from "@whiskeysockets/baileys";
import Message from "../models/Message";

// Busca no banco o conteúdo de uma mensagem já enviada/recebida, para o
// Baileys reenviá-la quando o WhatsApp pede (substitui o makeInMemoryStore,
// que guardava todas as mensagens na RAM sem nunca liberar).
export const getStoredMessage = async (
  key: WAMessageKey
): Promise<proto.IMessage | undefined> => {
  if (!key?.id) return undefined;

  const stored = await Message.findOne({
    where: { id: key.id },
    attributes: ["dataJson"],
    order: [["createdAt", "DESC"]]
  });
  if (!stored?.dataJson) return undefined;

  try {
    return JSON.parse(stored.dataJson)?.message ?? undefined;
  } catch {
    return undefined;
  }
};
