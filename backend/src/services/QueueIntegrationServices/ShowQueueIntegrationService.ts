import QueueIntegrations from "../../models/QueueIntegrations";
import AppError from "../../errors/AppError";

// Antes a empresa não era conferida (a checagem estava comentada): qualquer
// usuário lia a integração de outra empresa, e editá-la a trazia para a sua.
const ShowQueueIntegrationService = async (id: string | number, companyId: number): Promise<QueueIntegrations> => {
  const integration = await QueueIntegrations.unscoped().findOne({ where: { id, companyId } });

  if (!integration) {
    throw new AppError("ERR_NO_DIALOG_FOUND", 404);
  }

  return integration;
};

export default ShowQueueIntegrationService;
