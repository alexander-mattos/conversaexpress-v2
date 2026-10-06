import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import Whatsapp from "../../models/Whatsapp";
import { CampaignInput, canEditCampaign } from "../../helpers/CampaignAccess";
import { createContactListFromTag } from "./ContactListFromTag";

// O status vem do registro, não do corpo (antes o corpo dizia o status e
// liberava editar uma campanha em andamento).
const UpdateService = async (id: number | string, input: CampaignInput, companyId: number): Promise<Campaign> => {
  const record = await Campaign.findOne({ where: { id, companyId } });
  if (!record) throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  if (!canEditCampaign(record)) throw new AppError("ERR_CAMPAIGN_NOT_EDITABLE", 400);

  let { contactListId } = input;
  if (input.tagId && input.tagId !== record.tagId) {
    contactListId = await createContactListFromTag(input.tagId, companyId, input.name, input.contactListId);
  } else if (input.tagId) {
    // Mesma tag: mantém a lista montada antes.
    contactListId = record.contactListId;
  }

  const status = record.status === "CANCELADA" ? record.status : input.scheduledAt ? "PROGRAMADA" : "INATIVA";
  await record.update({ ...input, contactListId, status });

  await record.reload({
    include: [{ model: ContactList }, { model: Whatsapp, attributes: ["id", "name"] }]
  });
  return record;
};

export default UpdateService;
