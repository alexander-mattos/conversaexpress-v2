import { Op } from "sequelize";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { campaignQueue } from "../../queues";

export async function CancelService(id: number) {
  const campaign = await Campaign.findByPk(id);
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
}
