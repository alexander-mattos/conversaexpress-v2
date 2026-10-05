export interface Announcement {
  id: number;
  title: string;
  text: string;
  priority: number;
  status: boolean;
  mediaPath?: string | null;
  mediaName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const PRIORITY_KEYS: Record<number, string> = { 1: "announcements.high", 2: "announcements.medium", 3: "announcements.low" };
export const PRIORITY_COLORS: Record<number, string> = { 1: "#b81111", 2: "orange", 3: "grey" };

// "Lido" por usuário, guardado no navegador: id -> updatedAt visto. A bolinha
// aparece só para informativo novo ou alterado (antes voltava a cada recarga).
export const seenKey = (userId: number) => `announcements:seen:${userId}`;

export const readSeen = (storage: Storage | undefined, userId: number): Record<string, string> => {
  try {
    const parsed = JSON.parse(storage?.getItem(seenKey(userId)) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const hasUnseen = (items: Announcement[], seen: Record<string, string>): boolean =>
  items.some(item => seen[String(item.id)] !== String(item.updatedAt ?? item.createdAt ?? ""));

export const markSeen = (storage: Storage | undefined, userId: number, items: Announcement[]): Record<string, string> => {
  const seen = Object.fromEntries(items.map(item => [String(item.id), String(item.updatedAt ?? item.createdAt ?? "")]));
  try {
    storage?.setItem(seenKey(userId), JSON.stringify(seen));
  } catch {
    // armazenamento indisponível: vale só nesta aba
  }
  return seen;
};
