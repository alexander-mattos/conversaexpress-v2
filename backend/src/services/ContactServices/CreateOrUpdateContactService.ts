import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import { isNil } from "lodash";
import { jidDigits } from "../../helpers/WhatsAppJid";
interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
  extraInfo?: ExtraInfo[];
  whatsappId?: number;
  // ID interno do WhatsApp (xxxx@lid), quando a mensagem veio assim.
  lid?: string;
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  companyId,
  extraInfo = [],
  whatsappId,
  lid
}: Request): Promise<Contact> => {
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");

  const io = getIO();
  let contact: Contact | null;

  contact = await Contact.findOne({
    where: {
      number,
      companyId
    }
  });

  // Contato que chegou pelo LID: procura pelo LID e pelo formato antigo, em
  // que os dígitos do LID eram gravados como se fossem o número.
  const lidDigits = lid ? jidDigits(lid) : "";
  if (!contact && lid && !isGroup) {
    contact =
      (await Contact.findOne({ where: { lid, companyId } })) ||
      (await Contact.findOne({ where: { number: lidDigits, companyId } }));
  }

  if (contact) {
    const changes: Record<string, unknown> = {};
    if (profilePicUrl) changes.profilePicUrl = profilePicUrl;
    if (lid && contact.lid !== lid) changes.lid = lid;
    // Telefone real conhecido agora: corrige contatos gravados com o LID.
    if (!isGroup && number && number !== lidDigits && contact.number !== number) changes.number = number;
    if (isNil(contact.whatsappId) && whatsappId) changes.whatsappId = whatsappId;
    if (Object.keys(changes).length > 0) await contact.update(changes);
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
      action: "update",
      contact
    });
  } else {
    contact = await Contact.create({
      name,
      number,
      profilePicUrl,
      email,
      isGroup,
      extraInfo,
      companyId,
      whatsappId,
      lid: lid || null
    });

    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });
  }

  return contact;
};

export default CreateOrUpdateContactService;
