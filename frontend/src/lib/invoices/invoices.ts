export interface Invoice {
  id: number;
  detail: string;
  value: number;
  dueDate: string;
  status: string;
}

const day = (value: string | Date) => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

// Mesma regra do frontend atual: paga; vencida se a data já passou; senão em aberto.
export const invoiceStatus = (invoice: Pick<Invoice, "status" | "dueDate">, now = new Date()): "paid" | "expired" | "open" => {
  if (invoice.status === "paid") return "paid";
  return day(invoice.dueDate) < day(now) ? "expired" : "open";
};

export const formatBRL = (value: number | string): string =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// "YYYY-MM-DD" (ou ISO) -> "DD/MM/YYYY", sem deslocar pelo fuso.
export const formatDay = (value?: string | null): string => {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
};

// Dias até o vencimento da empresa (tela de assinatura).
export const daysUntil = (value?: string | null, now = new Date()): number | null => {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((day(target) - day(now)) / 86400000);
};
