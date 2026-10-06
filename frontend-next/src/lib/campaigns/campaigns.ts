export type CampaignStatus = "INATIVA" | "PROGRAMADA" | "EM_ANDAMENTO" | "CANCELADA" | "FINALIZADA";

export interface ContactListRef {
  id: number;
  name: string;
}

export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus | string;
  message1?: string;
  message2?: string;
  message3?: string;
  message4?: string;
  message5?: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  whatsappId?: number | null;
  whatsapp?: { id: number; name: string } | null;
  contactListId?: number | null;
  contactList?: (ContactListRef & { contacts?: { id: number; isWhatsappValid?: boolean }[] }) | null;
  tagId?: number | null;
  fileListId?: number | null;
  mediaPath?: string | null;
  mediaName?: string | null;
  shipping?: { id: number; deliveredAt?: string | null }[];
}

export const STATUS_KEYS: Record<string, string> = {
  INATIVA: "campaigns.status.inactive",
  PROGRAMADA: "campaigns.status.programmed",
  EM_ANDAMENTO: "campaigns.status.inProgress",
  CANCELADA: "campaigns.status.canceled",
  FINALIZADA: "campaigns.status.finished"
};

const HOUR = 60 * 60 * 1000;

// Mesmas regras da API: programada só até 1h antes; cancelada pode ser
// ajustada e reiniciada.
export const canEdit = (campaign: Pick<Campaign, "status" | "scheduledAt">, now = Date.now()): boolean => {
  if (!["INATIVA", "PROGRAMADA", "CANCELADA"].includes(campaign.status)) return false;
  if (campaign.status !== "PROGRAMADA" || !campaign.scheduledAt) return true;
  return new Date(campaign.scheduledAt).getTime() - now > HOUR;
};
export const canCancel = (status: string): boolean => status === "PROGRAMADA" || status === "EM_ANDAMENTO";
export const canRestart = (status: string): boolean => status === "CANCELADA";
export const canDelete = (status: string): boolean => status !== "EM_ANDAMENTO";

const pad = (n: number) => String(n).padStart(2, "0");

// ISO -> valor do <input type="datetime-local"> no fuso do navegador.
export const toLocalInput = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// datetime-local (horário local) -> ISO para a API.
export const fromLocalInput = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Relatório: contatos válidos da lista e envios entregues.
export const reportCounts = (campaign: Campaign | null): { valid: number; delivered: number; percent: number } => {
  const valid = (campaign?.contactList?.contacts ?? []).filter(c => c.isWhatsappValid !== false).length;
  const delivered = (campaign?.shipping ?? []).filter(s => !!s.deliveredAt).length;
  return { valid, delivered, percent: valid > 0 ? Math.min(100, Math.round((delivered / valid) * 100)) : 0 };
};

export interface CampaignVariable {
  key: string;
  value: string;
}

export interface CampaignSettings {
  messageInterval: number;
  longerIntervalAfter: number;
  greaterInterval: number;
  variables: CampaignVariable[];
}

export const DEFAULT_SETTINGS: CampaignSettings = { messageInterval: 20, longerIntervalAfter: 20, greaterInterval: 60, variables: [] };

// Lista da API ([{ key, value }]) -> configurações; valor que não é JSON válido
// fica com o padrão (o frontend atual quebrava a tela nesse caso).
export const parseSettings = (rows: { key: string; value: string }[]): CampaignSettings => {
  const settings: CampaignSettings = { ...DEFAULT_SETTINGS, variables: [] };
  for (const row of rows ?? []) {
    let value: unknown;
    try {
      value = JSON.parse(row.value);
    } catch {
      continue;
    }
    if (row.key === "variables" && Array.isArray(value)) {
      settings.variables = value.filter(v => v && typeof v.key === "string").map(v => ({ key: v.key, value: String(v.value ?? "") }));
    } else if (row.key === "messageInterval" || row.key === "longerIntervalAfter" || row.key === "greaterInterval") {
      if (Number.isFinite(Number(value))) settings[row.key] = Number(value);
    }
  }
  return settings;
};

// Mesma regra da API para o atalho da variável ({atalho} na mensagem).
export const isValidVariableKey = (key: string): boolean => /^[\w-]{1,50}$/.test(key);
