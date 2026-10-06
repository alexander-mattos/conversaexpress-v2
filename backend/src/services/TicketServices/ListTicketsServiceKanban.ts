import { Op, fn, where, col, WhereOptions, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO, isValid } from "date-fns";
import { intersection } from "lodash";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import User from "../../models/User";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { allowedQueueIds, userQueueIds, visibleTicketsWhere } from "../../helpers/KanbanAccess";

interface Request {
  user: { id: string | number; profile: string };
  companyId: number;
  searchParam?: string;
  date?: string;
  updatedAt?: string;
  showAll?: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tags: number[];
  users: number[];
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const dayRange = (value: string) => {
  const day = parseISO(value);
  if (!isValid(day)) throw new AppError("ERR_INVALID_FILTER", 400);
  return { [Op.between]: [+startOfDay(day), +endOfDay(day)] };
};

// Os filtros só restringem: antes a busca, a data e "não lidas" substituíam a
// condição de visibilidade e mostravam tickets de outros usuários e filas, e
// showAll=true valia para qualquer perfil.
const ListTicketsServiceKanban = async ({
  user,
  companyId,
  searchParam = "",
  date,
  updatedAt,
  showAll,
  withUnreadMessages,
  queueIds,
  tags,
  users
}: Request): Promise<Response> => {
  const conditions: WhereOptions[] = [{ companyId }, { status: { [Op.in]: ["pending", "open"] } }];

  if (!(user.profile === "admin" && showAll === "true")) {
    const own = await userQueueIds(user.id);
    conditions.push(visibleTicketsWhere(user.id, allowedQueueIds(own, queueIds)));
  }

  const search = searchParam.toLocaleLowerCase().trim();
  if (search) {
    conditions.push({
      [Op.or]: [
        where(fn("LOWER", col("contact.name")), "LIKE", `%${search}%`),
        { "$contact.number$": { [Op.like]: `%${search}%` } },
        where(fn("LOWER", col("Ticket.lastMessage")), "LIKE", `%${search}%`)
      ]
    });
  }

  if (date) conditions.push({ createdAt: dayRange(date) });
  if (updatedAt) conditions.push({ updatedAt: dayRange(updatedAt) });
  if (withUnreadMessages === "true") conditions.push({ unreadMessages: { [Op.gt]: 0 } });

  if (tags.length > 0) {
    const perTag = await Promise.all(
      tags.map(async tagId => (await TicketTag.findAll({ where: { tagId }, attributes: ["ticketId"] })).map(t => t.ticketId))
    );
    conditions.push({ id: { [Op.in]: intersection(...perTag) } });
  }

  if (users.length > 0) conditions.push({ userId: { [Op.in]: users } });

  const include: Includeable[] = [
    { model: Contact, as: "contact", attributes: ["id", "name", "number", "email"] },
    { model: Queue, as: "queue", attributes: ["id", "name", "color"] },
    { model: User, as: "user", attributes: ["id", "name"] },
    { model: Tag, as: "tags", attributes: ["id", "name", "color"] },
    { model: Whatsapp, as: "whatsapp", attributes: ["name"] }
  ];

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: { [Op.and]: conditions },
    include,
    distinct: true,
    order: [["updatedAt", "DESC"]],
    subQuery: false
  });

  return { tickets, count, hasMore: false };
};

export default ListTicketsServiceKanban;
