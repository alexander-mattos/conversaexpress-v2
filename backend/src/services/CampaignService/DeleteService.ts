import fs from "fs";
import Campaign from "../../models/Campaign";
import AppError from "../../errors/AppError";
import { campaignMediaFolder, campaignMediaPath } from "../../config/upload";

const DeleteService = async (id: string, companyId: number): Promise<void> => {
  const record = await Campaign.findOne({ where: { id, companyId } });

  if (!record) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  if (record.status === "EM_ANDAMENTO") {
    throw new AppError("Não é permitido excluir campanha em andamento", 400);
  }

  // A mídia sai junto com a campanha.
  if (record.mediaPath) fs.rmSync(campaignMediaPath(record.id, record.mediaPath), { force: true });
  fs.rmSync(campaignMediaFolder(record.id), { recursive: true, force: true });

  await record.destroy();
};

export default DeleteService;
