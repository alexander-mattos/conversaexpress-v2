// Minutos -> "HH[h] mm[m]", igual ao moment().startOf("day").add(min, "minutes")
// do frontend atual (inclusive voltando a 00h depois de 24 horas).
export const formatTime = (minutes: number | string | null | undefined): string => {
  const total = Math.floor(Number(minutes) || 0);
  const ofDay = ((total % 1440) + 1440) % 1440;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(ofDay / 60))}h ${pad(ofDay % 60)}m`;
};
