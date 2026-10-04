import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import Company from "./models/Company";
import { closeQueues, startQueueProcess } from "./queues";

const server = app.listen(process.env.PORT, async () => {
  const companies = await Company.findAll();
  const allPromises: any[] = [];
  companies.map(async c => {
    const promise = StartAllWhatsAppsSessions(c.id);
    allPromises.push(promise);
  });

  Promise.all(allPromises).then(() => {
    startQueueProcess().catch(err => logger.error(err, "Falha ao iniciar filas"));
  });
  logger.info(`Server started on port: ${process.env.PORT}`);
});

// A transferência de tickets agora é um agendador do BullMQ (queues.ts).

initIO(server);
gracefulShutdown(server, {
  onShutdown: async () => {
    await closeQueues();
  }
});
