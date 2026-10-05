// Tarefas da tela /todolist, guardadas no navegador. O frontend atual usava
// uma única chave "tasks" para todos os usuários do computador; agora cada
// usuário tem a sua, e a lista antiga passa uma vez para quem abrir primeiro.
export interface Todo {
  text: string;
  createdAt: string;
  updatedAt: string;
}

const LEGACY_KEY = "tasks";

export const todosKey = (companyId: number, userId: number) => `tasks:${companyId}:${userId}`;

const toIso = (value: unknown, fallback: string): string => {
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

export const parseTodos = (raw: string | null): Todo[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = new Date().toISOString();
    return parsed
      .filter(item => item && typeof item.text === "string")
      .map(item => {
        const createdAt = toIso(item.createdAt, now);
        return { text: item.text, createdAt, updatedAt: toIso(item.updatedAt, createdAt) };
      });
  } catch {
    return [];
  }
};

export const loadTodos = (storage: Storage, companyId: number, userId: number): Todo[] => {
  const key = todosKey(companyId, userId);
  const own = storage.getItem(key);
  if (own !== null) return parseTodos(own);
  const legacy = storage.getItem(LEGACY_KEY);
  if (legacy === null) return [];
  const todos = parseTodos(legacy);
  storage.setItem(key, JSON.stringify(todos));
  storage.removeItem(LEGACY_KEY);
  return todos;
};

export const saveTodos = (storage: Storage, companyId: number, userId: number, todos: Todo[]): void => {
  storage.setItem(todosKey(companyId, userId), JSON.stringify(todos));
};
