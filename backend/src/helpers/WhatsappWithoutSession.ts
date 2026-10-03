import Whatsapp from "../models/Whatsapp";

// Remove a coluna session (chaves do Baileys) de tudo que vai para o cliente,
// seja resposta HTTP ou evento de socket.
const withoutSession = (whatsapp?: Whatsapp | null) => {
  if (!whatsapp) return whatsapp;
  const { session, ...data } = whatsapp.toJSON() as Record<string, unknown>;
  return data;
};

export default withoutSession;
