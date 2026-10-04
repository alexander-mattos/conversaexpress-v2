import { Request, Response } from "express";
import { assertCompanyAccess } from "../helpers/CompanyAccess";
import { getIO, queueRoom } from "../libs/socket";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketUUIDService from "../services/TicketServices/ShowTicketFromUUIDService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListTicketsServiceKanban from "../services/TicketServices/ListTicketsServiceKanban";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  updatedAt?: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
  tags: string;
  users: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  whatsappId: string;
  useIntegration: boolean;
  promptId: number;
  integrationId: number;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId,


  });
  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId, queueId, whatsappId }: TicketData = req.body;
  const { companyId } = req.user;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    companyId,
    queueId,
    whatsappId
  });

  const io = getIO();
  io.to(ticket.status).emit(`company-${companyId}-ticket`, {
    action: "update",
    ticket
  });
  return res.status(200).json(ticket);
};

export const kanban = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;


  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsServiceKanban({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId

  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;

  const contact = await ShowTicketService(ticketId, companyId);
  return res.status(200).json(contact);
};

export const showFromUUID = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { uuid } = req.params;

  const ticket: Ticket = await ShowTicketUUIDService(uuid);
  await assertCompanyAccess(ticket.companyId, req.user);

  return res.status(200).json(ticket);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;
  const { companyId, id} = req.user;

  const { ticket } = await UpdateTicketService({
    ticketData,
    ticketId,
    companyId,
    actionUserId: id
  });


  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId, profile } = req.user;

  // Mesma regra da tela (ticket-options:deleteTicket): só admin exclui.
  if (profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await ShowTicketService(ticketId, companyId);

  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  io.to(ticketId)
    .to(`company-${companyId}-${ticket.status}`)
    .to(`company-${companyId}-notification`)
    .to(queueRoom(ticket.queueId, companyId, ticket.status))
    .to(queueRoom(ticket.queueId, companyId, "notification"))
    .emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};
