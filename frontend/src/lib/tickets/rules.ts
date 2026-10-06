import type { AppMessageEvent, Ticket } from "./types";

interface ViewerUser {
  id: number;
  profile: string;
  allTicket?: string;
  queues: { id: number }[];
}

// A lista mostra o ticket se ele é do usuário (ou sem dono, ou "mostrar
// todos") e está numa fila selecionada (ou sem fila).
export const shouldUpdateTicket = (
  ticket: Ticket,
  userId: number,
  showAll: boolean,
  selectedQueueIds: number[]
): boolean =>
  (!ticket.userId || ticket.userId === userId || showAll) &&
  (!ticket.queueId || selectedQueueIds.includes(ticket.queueId));

export const notBelongsToSelectedQueues = (ticket: Ticket, selectedQueueIds: number[]): boolean =>
  !!ticket.queueId && !selectedQueueIds.includes(ticket.queueId);

// Perfil "user" só vê tickets das próprias filas (os sem fila também saem,
// como no frontend atual).
export const filterForProfile = (tickets: Ticket[], profile: string, queues: { id: number }[]): Ticket[] => {
  if (profile !== "user") return tickets;
  const queueIds = queues.map(q => q.id);
  return tickets.filter(t => t.queueId !== null && queueIds.includes(t.queueId));
};

// Quem tem "ver tickets sem fila" habilitado também é avisado dos pendentes.
// O frontend atual comparava com "enable" e nunca acertava.
export const showsPendingNotifications = (user: ViewerUser): boolean => user.allTicket === "enabled";

// Mensagem recebida que entra na lista de notificações.
export const isNotifiableMessage = (data: AppMessageEvent, user: ViewerUser): boolean => {
  const { message, ticket } = data;
  if (data.action !== "create" || message.fromMe) return false;
  const pending = ticket.status === "pending";
  if (pending && !showsPendingNotifications(user)) return false;
  if (!pending && message.read) return false;
  if (ticket.userId && ticket.userId !== user.id) return false;
  return !ticket.queueId || user.queues.some(q => q.id === ticket.queueId);
};

// Sem som nem notificação do navegador para o ticket que está aberto na tela
// (o frontend atual comparava o uuid da URL com o id e sempre notificava),
// para tickets de outro atendente e para grupos.
export const shouldAlert = (
  data: AppMessageEvent,
  user: ViewerUser,
  openTicketUuid: string | null,
  pageVisible: boolean
): boolean => {
  const { ticket } = data;
  if (openTicketUuid && ticket.uuid === openTicketUuid && pageVisible) return false;
  if (ticket.userId && ticket.userId !== user.id) return false;
  return !ticket.isGroup;
};

// Saudação automática ao aceitar: só com a configuração habilitada. Sem a
// configuração, o frontend atual quebrava ao aceitar.
export const greetingEnabled = (settings: { key: string; value: string }[] | null | undefined): boolean =>
  !!settings?.some(s => s.key === "sendGreetingAccepted" && s.value === "enabled");

export const greetingMessage = (userName: string): string =>
  `*Mensagem Automática:*\n{{ms}} *{{name}}*, meu nome é *${userName}* e agora vou prosseguir com seu atendimento!`;
