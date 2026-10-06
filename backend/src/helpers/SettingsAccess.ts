import AppError from "../errors/AppError";
import { parseExternalUrl } from "./SafeExternalUrl";

// Opções da tela de Configurações e os valores aceitos (os mesmos selects).
export const OPTION_SETTINGS: Record<string, string[]> = {
  userRating: ["disabled", "enabled"],
  scheduleType: ["disabled", "queue", "company"],
  call: ["disabled", "enabled"],
  chatBotType: ["text", "button", "list"],
  CheckMsgIsGroup: ["disabled", "enabled"],
  sendGreetingAccepted: ["disabled", "enabled"],
  sendMsgTransfTicket: ["disabled", "enabled"],
  sendGreetingMessageOneQueues: ["disabled", "enabled"]
};

// Credenciais das integrações: só de escrita, nunca voltam na API.
export const SECRET_SETTINGS = ["asaas", "tokenixc", "clientidmkauth", "clientsecretmkauth", "tokensgp"];

// Endereços das integrações: só URL externa (sem rede interna do servidor).
export const URL_SETTINGS = ["ipixc", "ipmkauth", "ipsgp"];

// Liberadas pelo super (ex.: campanhas fora do plano).
export const SUPER_SETTINGS = ["campaignsEnabled"];
const SUPER_VALUES: Record<string, string[]> = { campaignsEnabled: ["true", "false"] };

// O que qualquer perfil pode ler (a tela de atendimento e o menu usam).
export const PUBLIC_SETTINGS = [...Object.keys(OPTION_SETTINGS), "campaignsEnabled"];

interface SettingRow {
  key: string;
  value: string;
  [field: string]: unknown;
}

// Admin vê tudo, com os segredos mascarados ({ value: "", configured });
// os demais perfis só as opções públicas. Antes qualquer usuário recebia os
// tokens do Asaas, IXC e MK-AUTH.
export const presentSettings = (rows: SettingRow[], isAdmin: boolean): SettingRow[] =>
  rows
    .filter(row => isAdmin || PUBLIC_SETTINGS.includes(row.key))
    .map(row => (SECRET_SETTINGS.includes(row.key) ? { ...row, value: "", configured: !!row.value } : row));

export type SettingChange = { key: string; value: string } | { key: string; keep: true };

// Só chaves conhecidas, com valor válido. Segredo em branco mantém o atual.
export const parseSettingChange = (key: string, rawValue: unknown, isSuper: boolean): SettingChange => {
  const value = rawValue === undefined || rawValue === null ? "" : String(rawValue);
  if (OPTION_SETTINGS[key]) {
    if (!OPTION_SETTINGS[key].includes(value)) throw new AppError("ERR_SETTING_INVALID_VALUE", 400);
    return { key, value };
  }
  if (SECRET_SETTINGS.includes(key)) {
    if (value.trim() === "") return { key, keep: true };
    if (value.length > 500) throw new AppError("ERR_SETTING_INVALID_VALUE", 400);
    return { key, value: value.trim() };
  }
  if (URL_SETTINGS.includes(key)) {
    if (value.trim() === "") return { key, value: "" };
    parseExternalUrl(value);
    return { key, value: value.trim() };
  }
  if (SUPER_SETTINGS.includes(key)) {
    if (!isSuper) throw new AppError("ERR_NO_PERMISSION", 403);
    if (!SUPER_VALUES[key].includes(value)) throw new AppError("ERR_SETTING_INVALID_VALUE", 400);
    return { key, value };
  }
  throw new AppError("ERR_SETTING_INVALID_KEY", 400);
};
