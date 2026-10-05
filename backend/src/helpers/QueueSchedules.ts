import AppError from "../errors/AppError";

export interface QueueSchedule {
  weekday: string;
  weekdayEn: string;
  startTime: string;
  endTime: string;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Horários de atendimento da fila (um por dia da semana, "HH:MM" ou vazio).
// Antes eram gravados como vieram, e um valor inválido quebrava a checagem de
// expediente no recebimento de mensagens.
export const parseQueueSchedules = (value: unknown): QueueSchedule[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 7) {
    throw new AppError("ERR_QUEUE_INVALID_SCHEDULES");
  }
  return value.map(item => {
    const weekday = String(item?.weekday ?? "");
    const weekdayEn = String(item?.weekdayEn ?? "").toLowerCase();
    const startTime = String(item?.startTime ?? "");
    const endTime = String(item?.endTime ?? "");
    const validTime = (time: string) => time === "" || TIME.test(time);
    if (!WEEKDAYS_EN.includes(weekdayEn) || !validTime(startTime) || !validTime(endTime)) {
      throw new AppError("ERR_QUEUE_INVALID_SCHEDULES");
    }
    return { weekday, weekdayEn, startTime, endTime };
  });
};
