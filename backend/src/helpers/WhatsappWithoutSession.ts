import Whatsapp from "../models/Whatsapp";

// Remove a coluna session (chaves do Baileys) e o token da API de mensagens de
// tudo que vai para o cliente, seja resposta HTTP ou evento de socket (que
// chega a todos os usuários da empresa). O admin recebe o token pela rota da
// conexão (withToken = true).
const withoutSession = (whatsapp?: Whatsapp | null, withToken = false) => {
  if (!whatsapp) return whatsapp;
  const { session, token, ...data } = whatsapp.toJSON() as Record<string, unknown>;
  return withToken ? { ...data, token } : data;
};

export default withoutSession;
