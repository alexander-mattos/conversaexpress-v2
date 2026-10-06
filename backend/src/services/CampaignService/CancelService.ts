import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { campaignQueue } from "../../queues";
import { canCancelCampaign } from "../../helpers/CampaignAccess";

export async function CancelService(id: number, companyId: number) {
  const campaign = await Campaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  if (!canCancelCampaign(campaign.status)) throw new AppError("ERR_CAMPAIGN_CANNOT_CANCEL", 400);
  await campaign.update({ status: "CANCELADA" });

  const recordsToCancel = await CampaignShipping.findAll({
    where: {
      campaignId: campaign.id,
      jobId: { [Op.not]: null },
      deliveredAt: null
    }
  });

  const promises = [];

  for (let record of recordsToCancel) {
    // O job pode já ter sido executado ou removido.
    const job = await campaignQueue.getJob(String(record.jobId));
    if (job) promises.push(job.remove());
  }

  await Promise.all(promises);
  return campaign;
}
