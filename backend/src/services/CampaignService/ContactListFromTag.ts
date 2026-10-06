import TicketTag from "../../models/TicketTag";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";

interface Person {
  name: string;
  number: string;
  email: string;
}

// Monta uma lista nova com os contatos dos tickets da tag (e, se houver, os da
// lista escolhida). Tudo filtrado pela empresa: antes uma tag ou lista de
// outra empresa copiava os contatos dela.
export const createContactListFromTag = async (
  tagId: number,
  companyId: number,
  campaignName: string,
  contactListId?: number | null
): Promise<number> => {
  const ticketIds = (await TicketTag.findAll({ where: { tagId }, attributes: ["ticketId"] })).map(t => t.ticketId);
  const contactIds = (
    await Ticket.findAll({ where: { id: ticketIds, companyId }, attributes: ["contactId"] })
  ).map(t => t.contactId);
  const tagContacts = await Contact.findAll({ where: { id: contactIds, companyId }, attributes: ["name", "number", "email"] });

  const byNumber = new Map<string, Person>();
  if (contactListId) {
    const items = await ContactListItem.findAll({ where: { contactListId, companyId }, attributes: ["name", "number", "email"] });
    for (const item of items) byNumber.set(item.number, { name: item.name, number: item.number, email: item.email });
  }
  for (const contact of tagContacts) byNumber.set(contact.number, { name: contact.name, number: contact.number, email: contact.email });

  const list = await ContactList.create({ name: `${campaignName} | TAG: ${tagId} - ${new Date().toISOString()}`, companyId });
  await ContactListItem.bulkCreate(
    [...byNumber.values()].map(person => ({ ...person, contactListId: list.id, companyId, isWhatsappValid: true }))
  );
  return list.id;
};
