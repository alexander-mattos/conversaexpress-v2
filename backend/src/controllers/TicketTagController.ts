import { Request, Response } from "express";
import AppError from "../errors/AppError";
import sequelize from "../database";
import { getIO, queueRoom } from "../libs/socket";
import Ticket from "../models/Ticket";
import TicketTag from "../models/TicketTag";
import Tag from "../models/Tag";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import { assertCanSeeTicket, assertPlanFeature } from "../helpers/KanbanAccess";

// O ticket precisa ser da empresa de quem pede e visível para ele (antes
// qualquer usuário punha ou tirava tags de tickets de outras empresas).
const loadTicket = async (ticketId: string, user: Request["user"]): Promise<Ticket> => {
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId: user.companyId },
    attributes: ["id", "companyId", "userId", "status", "queueId"]
  });
  if (!ticket) throw new AppError("ERR_NO_TICKET_FOUND", 404);
  await assertCanSeeTicket(ticket, user);
  return ticket;
};

const kanbanTagIds = async (companyId: number): Promise<number[]> =>
  (await Tag.findAll({ where: { companyId, kanban: 1 }, attributes: ["id"] })).map(tag => tag.id);

const parseTagId = (value: unknown): number => {
  const tagId = Number(value);
  if (!Number.isInteger(tagId) || tagId <= 0) throw new AppError("ERR_INVALID_TAG", 400);
  return tagId;
};

const assertTagInCompany = async (tagId: number, companyId: number): Promise<Tag> => {
  const tag = await Tag.findByPk(tagId, { attributes: ["id", "companyId", "kanban"] });
  if (!tag) throw new AppError("ERR_NOT_FOUND", 404);
  if (Number(tag.companyId) !== Number(companyId)) throw new AppError("ERR_NO_PERMISSION", 403);
  return tag;
};

const emitTicketUpdate = async (ticketId: number, companyId: number): Promise<Ticket> => {
  const ticket = await ShowTicketService(ticketId, companyId);
  getIO()
    .to(`company-${companyId}-${ticket.status}`)
    .to(`company-${companyId}-notification`)
    .to(queueRoom(ticket.queueId, companyId, ticket.status))
    .to(queueRoom(ticket.queueId, companyId, "notification"))
    .to(ticket.id.toString())
    .to(`user-${ticket.userId}`)
    .emit(`company-${companyId}-ticket`, { action: "update", ticket });
  return ticket;
};

// Move o ticket de coluna no Kanban: tira as tags de kanban, mantém as comuns
// e põe a nova (tagId null = "Em aberto"), tudo numa transação.
export const kanban = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  await assertPlanFeature(companyId, "useKanban", userId);

  const ticket = await loadTicket(req.params.ticketId, req.user);
  const raw = req.body?.tagId;
  const tagId = raw === null || raw === undefined || raw === "" ? null : parseTagId(raw);

  if (tagId !== null) {
    const tag = await assertTagInCompany(tagId, companyId);
    if (Number(tag.kanban) !== 1) throw new AppError("ERR_TAG_NOT_KANBAN", 400);
  }

  const kanbanIds = await kanbanTagIds(companyId);
  await sequelize.transaction(async transaction => {
    if (kanbanIds.length > 0) {
      await TicketTag.destroy({ where: { ticketId: ticket.id, tagId: kanbanIds }, transaction });
    }
    if (tagId !== null) await TicketTag.create({ ticketId: ticket.id, tagId }, { transaction });
  });

  const updated = await emitTicketUpdate(ticket.id, companyId);
  return res.status(200).json(updated);
};

// Rotas antigas (frontend atual): mesmas checagens e sem linhas duplicadas.
export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  await assertPlanFeature(companyId, "useKanban", userId);
  const ticket = await loadTicket(req.params.ticketId, req.user);
  const tagId = parseTagId(req.params.tagId);
  await assertTagInCompany(tagId, companyId);

  const [ticketTag] = await TicketTag.findOrCreate({ where: { ticketId: ticket.id, tagId } });
  await emitTicketUpdate(ticket.id, companyId);
  return res.status(201).json(ticketTag);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  await assertPlanFeature(companyId, "useKanban", userId);
  const ticket = await loadTicket(req.params.ticketId, req.user);

  const kanbanIds = await kanbanTagIds(companyId);
  if (kanbanIds.length > 0) await TicketTag.destroy({ where: { ticketId: ticket.id, tagId: kanbanIds } });

  await emitTicketUpdate(ticket.id, companyId);
  return res.status(200).json({ message: "Ticket tags removed successfully." });
};
