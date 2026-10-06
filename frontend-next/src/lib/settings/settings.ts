export interface SettingRow {
  key: string;
  value: string;
  configured?: boolean;
}

export interface OptionDef {
  key: string;
  title: string;
  options: { value: string; label: string }[];
}

const ON_OFF = (enabled = "settings.options.fields.enabled") => [
  { value: "disabled", label: "settings.options.fields.disabled" },
  { value: "enabled", label: enabled }
];

// Mesmos selects da tela atual (e a mesma lista branca da API).
export const OPTIONS: OptionDef[] = [
  {
    key: "userRating",
    title: "settings.options.fields.ratings.title",
    options: [
      { value: "disabled", label: "settings.options.fields.ratings.disabled" },
      { value: "enabled", label: "settings.options.fields.ratings.enabled" }
    ]
  },
  {
    key: "scheduleType",
    title: "settings.options.fields.expedientManager.title",
    options: [
      { value: "disabled", label: "settings.options.fields.disabled" },
      { value: "queue", label: "settings.options.fields.expedientManager.queue" },
      { value: "company", label: "settings.options.fields.expedientManager.company" }
    ]
  },
  { key: "CheckMsgIsGroup", title: "settings.options.fields.ignoreMessages.title", options: ON_OFF("settings.options.fields.active") },
  {
    key: "call",
    title: "settings.options.fields.acceptCall.title",
    options: [
      { value: "disabled", label: "settings.options.fields.acceptCall.disabled" },
      { value: "enabled", label: "settings.options.fields.acceptCall.enabled" }
    ]
  },
  { key: "chatBotType", title: "settings.options.fields.chatbotType.title", options: [{ value: "text", label: "settings.options.fields.chatbotType.text" }] },
  { key: "sendGreetingAccepted", title: "settings.options.fields.sendGreetingAccepted.title", options: ON_OFF() },
  { key: "sendMsgTransfTicket", title: "settings.options.fields.sendMsgTransfTicket.title", options: ON_OFF() },
  { key: "sendGreetingMessageOneQueues", title: "settings.options.fields.sendGreetingMessageOneQueues.title", options: ON_OFF() }
];

export interface IntegrationField {
  key: string;
  label: string;
  secret: boolean;
}

export const INTEGRATIONS: { title: string; fields: IntegrationField[] }[] = [
  {
    title: "IXC",
    fields: [
      { key: "ipixc", label: "settings.integrations.ipixc", secret: false },
      { key: "tokenixc", label: "settings.integrations.tokenixc", secret: true }
    ]
  },
  {
    title: "MK-AUTH",
    fields: [
      { key: "ipmkauth", label: "settings.integrations.ipmkauth", secret: false },
      { key: "clientidmkauth", label: "settings.integrations.clientidmkauth", secret: true },
      { key: "clientsecretmkauth", label: "settings.integrations.clientsecretmkauth", secret: true }
    ]
  },
  { title: "ASAAS", fields: [{ key: "asaas", label: "settings.integrations.asaas", secret: true }] }
];

export const settingValue = (rows: SettingRow[], key: string): string => rows.find(row => row.key === key)?.value ?? "";
export const isConfigured = (rows: SettingRow[], key: string): boolean => !!rows.find(row => row.key === key)?.configured;

// Aplica a resposta da API (ou o evento do socket) na lista.
export const upsertSetting = (rows: SettingRow[], setting: SettingRow): SettingRow[] =>
  rows.some(row => row.key === setting.key) ? rows.map(row => (row.key === setting.key ? { ...row, ...setting } : row)) : [...rows, setting];

// URL de integração: http(s) e sem rede interna (o backend confere de novo).
export const looksLikeExternalUrl = (value: string): boolean => {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return !(
      host === "localhost" ||
      host.endsWith(".localhost") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
};

export const RECURRENCES = ["MENSAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"];
const MONTHS: Record<string, number> = { MENSAL: 1, BIMESTRAL: 2, TRIMESTRAL: 3, SEMESTRAL: 6, ANUAL: 12 };

// "+ Vencimento": soma a recorrência à data (YYYY-MM-DD), como o atual.
export const addRecurrence = (date: string, recurrence: string): string => {
  const months = MONTHS[recurrence];
  if (!date || !months) return date;
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};

// Cor da linha da empresa pela proximidade do vencimento (igual ao atual).
export const dueDateColor = (dueDate?: string | null, now = new Date()): string | undefined => {
  if (!dueDate) return undefined;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return undefined;
  const diff = Math.floor((due.getTime() - now.getTime()) / 86400000);
  if (diff === 5) return "#fffead";
  if (diff >= -3 && diff <= 4) return "#f7cc8f";
  if (diff === -4) return "#fa8c8c";
  return undefined;
};
