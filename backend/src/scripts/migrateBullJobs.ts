/* eslint-disable no-console */
// Migração única Bull 4 -> BullMQ, executada no deploy (npm run queues:migrate).
// Copia os jobs pendentes (waiting e delayed) para as filas novas mantendo o
// atraso restante, atualiza CampaignShipping.jobId e apaga as filas antigas,
// incluindo os agendamentos repetidos legados. Sem jobs antigos, não faz nada.
import "../bootstrap";
import Bull from "bull";
import { Queue } from "bullmq";
import "../database";
import CampaignShipping from "../models/CampaignShipping";
import { campaignQueue, messageQueue, sendScheduledMessages, closeQueues } from "../queues";

const redisUri = process.env.REDIS_URI || "";

// Filas antigas com jobs a migrar, e o destino de cada uma no BullMQ.
const MIGRATIONS: { name: string; target: Queue }[] = [
  { name: "MessageQueue", target: messageQueue },
  { name: "SendSacheduledMessages", target: sendScheduledMessages },
  { name: "CampaignQueue", target: campaignQueue }
];

// Filas antigas que só tinham agendamentos repetidos: apenas são apagadas.
const OBSOLETE = ["ScheduleMonitor", "UserMonitor", "QueueMonitor"];

// Jobs repetidos antigos viraram agendadores do BullMQ: não são copiados.
const isLegacyRepeat = (job: Bull.Job): boolean =>
  Boolean((job.opts as { repeat?: unknown }).repeat);

const migrateQueue = async (name: string, target: Queue): Promise<number> => {
  const legacy = new Bull(name, redisUri);
  let migrated = 0;
  try {
    const jobs = await legacy.getJobs(["waiting", "delayed"]);
    for (const job of jobs) {
      if (!job || isLegacyRepeat(job)) continue;

      const dueAt = job.timestamp + (job.opts.delay || 0);
      const delay = Math.max(0, dueAt - Date.now());
      const newJob = await target.add(job.name, job.data, {
        delay,
        attempts: job.opts.attempts,
        removeOnComplete: true
      });

      if (job.name === "DispatchCampaign") {
        await CampaignShipping.update(
          { jobId: String(newJob.id) },
          { where: { jobId: String(job.id) } }
        );
      }
      migrated += 1;
    }
    await legacy.obliterate({ force: true });
  } finally {
    await legacy.close();
  }
  return migrated;
};

const run = async (): Promise<void> => {
  for (const { name, target } of MIGRATIONS) {
    const count = await migrateQueue(name, target);
    console.log(`[queues:migrate] ${name}: ${count} job(s) migrado(s)`);
  }
  for (const name of OBSOLETE) {
    const legacy = new Bull(name, redisUri);
    await legacy.obliterate({ force: true });
    await legacy.close();
    console.log(`[queues:migrate] ${name}: fila antiga removida`);
  }
};

run()
  .then(async () => {
    await closeQueues();
    process.exit(0);
  })
  .catch(async err => {
    console.error("[queues:migrate] falhou:", err);
    await closeQueues().catch(() => undefined);
    process.exit(1);
  });
