// Reducer genérico das listas de cadastro (contatos, tags, respostas
// rápidas, agendamentos), sem mutar o estado e sem duplicar registros.
export type ListAction<T> =
  | { type: "LOAD"; payload: T[] }
  | { type: "UPSERT"; payload: T }
  // Atualiza só os campos enviados de um item já carregado.
  | { type: "PATCH"; payload: Partial<T> & { id: number | string } }
  | { type: "DELETE"; payload: number | string }
  | { type: "RESET" };

export const listReducer = <T extends { id: number | string }>(state: T[], action: ListAction<T>): T[] => {
  switch (action.type) {
    case "LOAD": {
      const byId = new Map(action.payload.map(item => [String(item.id), item]));
      const updated = state.map(item => byId.get(String(item.id)) ?? item);
      const known = new Set(state.map(item => String(item.id)));
      return [...updated, ...action.payload.filter(item => !known.has(String(item.id)))];
    }
    case "UPSERT":
      return state.some(item => String(item.id) === String(action.payload.id))
        ? state.map(item => (String(item.id) === String(action.payload.id) ? action.payload : item))
        : [action.payload, ...state];
    case "PATCH":
      return state.map(item => (String(item.id) === String(action.payload.id) ? { ...item, ...action.payload } : item));
    case "DELETE":
      return state.filter(item => String(item.id) !== String(action.payload));
    case "RESET":
      return [];
    default:
      return state;
  }
};
