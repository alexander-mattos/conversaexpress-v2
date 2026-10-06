import CampaignSetting from "../../models/CampaignSetting";
import { parseCampaignSettings } from "../../helpers/CampaignAccess";

interface Data {
  settings: unknown;
}

const CreateService = async (
  data: Data,
  companyId: number
): Promise<CampaignSetting[]> => {
  const values = parseCampaignSettings(data?.settings);
  const settings = [];
  for (const [key, value] of Object.entries(values)) {
    const [record, created] = await CampaignSetting.findOrCreate({
      where: { key, companyId },
      defaults: { key, value, companyId }
    });

    if (!created) {
      await record.update({ value });
    }

    settings.push(record);
  }

  return settings;
};

export default CreateService;
