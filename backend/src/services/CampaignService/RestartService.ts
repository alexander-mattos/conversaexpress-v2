import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import { campaignQueue } from "../../queues";
import { canRestartCampaign } from "../../helpers/CampaignAccess";

// Só campanha cancelada volta a disparar (quem já recebeu não recebe de novo:
// o envio entregue é pulado na fila).
export async function RestartService(id: number, companyId: number) {
  const campaign = await Campaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  if (!canRestartCampaign(campaign.status)) throw new AppError("ERR_CAMPAIGN_CANNOT_RESTART", 400);
  await campaign.update({ status: "EM_ANDAMENTO" });

  await campaignQueue.add("ProcessCampaign", {
    id: campaign.id,
    delay: 3000
  });
  return campaign;
}
