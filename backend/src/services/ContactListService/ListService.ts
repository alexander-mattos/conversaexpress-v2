import { Op, fn, col, where } from "sequelize";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import { isEmpty } from "lodash";

interface Request {
  companyId: number | string;
  searchParam?: string;
  pageNumber?: string;
}

interface Response {
  records: ContactList[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId
}: Request): Promise<Response> => {
  let whereCondition: any = {
    companyId
  };

  if (!isEmpty(searchParam)) {
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          name: where(
            fn("LOWER", col("ContactList.name")),
            "LIKE",
            `%${searchParam.toLowerCase().trim()}%`
          )
        }
      ]
    };
  }

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count: groupedCount, rows: records } = await ContactList.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["name", "ASC"]],
    subQuery: false,
    include: [
      {
        model: ContactListItem,
        as: "contacts",
        attributes: [],
        required: false
      }
    ],
    attributes: [
      "id",
      "name",
      [fn("count", col("contacts.id")), "contactsCount"]
    ],
    group: ["ContactList.id"]
  });

  // Com "group", o Sequelize devolve uma contagem por grupo (array): o total
  // é o número de grupos. Antes, hasMore saía sempre false e a lista parava
  // nos primeiros registros.
  const count = Array.isArray(groupedCount) ? groupedCount.length : groupedCount;
  const hasMore = count > offset + records.length;

  return {
    records,
    count,
    hasMore
  };
};

export default ListService;
