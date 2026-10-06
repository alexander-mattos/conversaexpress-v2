import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import Whatsapp from "../../models/Whatsapp";
import { CampaignInput } from "../../helpers/CampaignAccess";
import { createContactListFromTag } from "./ContactListFromTag";

// input já validado por parseCampaignInput (ids da empresa).
const CreateService = async (input: CampaignInput, companyId: number): Promise<Campaign> => {
  const contactListId = input.tagId
    ? await createContactListFromTag(input.tagId, companyId, input.name, input.contactListId)
    : input.contactListId;

  const record = await Campaign.create({
    ...input,
    contactListId,
    companyId,
    status: input.scheduledAt ? "PROGRAMADA" : "INATIVA"
  });

  await record.reload({
    include: [{ model: ContactList }, { model: Whatsapp, attributes: ["id", "name"] }]
  });
  return record;
};

export default CreateService;
