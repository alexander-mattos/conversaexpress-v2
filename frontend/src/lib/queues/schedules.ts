// Horários de atendimento da fila (aba "Horários de Atendimento").
export interface QueueSchedule {
  weekday: string;
  weekdayEn: string;
  startTime: string;
  endTime: string;
}

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

// O nome em português continua sendo gravado em "weekday", como no frontend
// atual; a tela mostra o nome traduzido a partir de "weekdayEn".
const PT_NAMES: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

// Mesmos valores padrão do frontend atual.
export const defaultSchedules = (): QueueSchedule[] =>
  WEEKDAYS.map(day => ({
    weekday: PT_NAMES[day],
    weekdayEn: day,
    startTime: day === "sunday" ? "00:00" : "08:00",
    endTime: day === "saturday" ? "12:00" : day === "sunday" ? "00:00" : "18:00"
  }));

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidTime = (value: string): boolean => value === "" || TIME_PATTERN.test(value);

// Máscara "##:##" (só dígitos, dois-pontos automático).
export const maskTime = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

// Completa os sete dias e mantém a ordem de segunda a domingo, mesmo que a fila
// tenha sido salva sem horários (null ou []).
export const normalizeSchedules = (value: unknown): QueueSchedule[] => {
  const saved = Array.isArray(value) ? (value as Partial<QueueSchedule>[]) : [];
  if (saved.length === 0) return defaultSchedules();
  return WEEKDAYS.map(day => {
    const found = saved.find(item => String(item?.weekdayEn ?? "").toLowerCase() === day);
    return {
      weekday: PT_NAMES[day],
      weekdayEn: day,
      startTime: found?.startTime ?? "",
      endTime: found?.endTime ?? ""
    };
  });
};
