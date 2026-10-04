import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import TicketTag from "../../models/TicketTag";

interface Request {
  tags: Tag[];
  ticketId: number;
  companyId: number;
}

const SyncTags = async ({
  tags,
  ticketId,
  companyId
}: Request): Promise<Ticket | null> => {
  const ticket = await Ticket.findByPk(ticketId, { include: [Tag] });
  if (!ticket) throw new AppError("ERR_NO_TICKET_FOUND", 404);

  // Ticket e tags precisam ser da empresa de quem pede (antes dava para
  // trocar as tags de um ticket de outra empresa).
  if (Number(ticket.companyId) !== Number(companyId)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const tagIds = [...new Set((Array.isArray(tags) ? tags : []).map(t => Number(t?.id)).filter(Boolean))];
  if (tagIds.length > 0) {
    const allowed = await Tag.count({ where: { id: { [Op.in]: tagIds }, companyId } });
    if (allowed !== tagIds.length) throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await TicketTag.destroy({ where: { ticketId } });
  await TicketTag.bulkCreate(tagIds.map(tagId => ({ tagId, ticketId })));

  await ticket.reload();

  return ticket;
};

export default SyncTags;
