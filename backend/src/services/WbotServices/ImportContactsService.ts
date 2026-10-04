import * as Sentry from "@sentry/node";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import { logger } from "../../utils/logger";
import ShowBaileysService from "../BaileysServices/ShowBaileysService";
import CreateContactService from "../ContactServices/CreateContactService";
import { isString, isArray } from "lodash";

const ImportContactsService = async (companyId: number): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
  const wbot = getWbot(defaultWhatsapp.id);

  let phoneContacts;

  // A lista de contatos do celular não é mais gravada em public/ (a pasta é
  // servida sem login: qualquer pessoa baixava os contatos da empresa).
  try {
    const contactsString = await ShowBaileysService(wbot.id);
    phoneContacts = JSON.parse(JSON.stringify(contactsString.contacts));
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Could not get whatsapp contacts from phone. Err: ${err}`);
  }

  const phoneContactsList = isString(phoneContacts)
    ? JSON.parse(phoneContacts)
    : phoneContacts;

  if (!isArray(phoneContactsList)) return;

  // Em sequência: o forEach(async) antigo não esperava as gravações.
  for (const { id, name, notify } of phoneContactsList) {
    if (!id || id === "status@broadcast" || id.includes("g.us")) continue;
    const number = id.replace(/\D/g, "");

    try {
      const existingContact = await Contact.findOne({ where: { number, companyId } });
      if (existingContact) {
        existingContact.name = name || notify;
        await existingContact.save();
      } else {
        await CreateContactService({ number, name: name || notify, companyId });
      }
    } catch (error) {
      Sentry.captureException(error);
      logger.warn(`Could not import phone contact. Err: ${error}`);
    }
  }
};

export default ImportContactsService;
