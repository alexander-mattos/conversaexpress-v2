// Árvore de opções do chatbot da fila, sempre atualizada sem mutação.
export interface QueueOptionNode {
  key: string;
  id?: number;
  title: string;
  message: string;
  option: string;
  parentId: number | null;
  editing: boolean;
  // null = filhos ainda não carregados.
  children: QueueOptionNode[] | null;
}

export type Path = number[];

let counter = 0;
export const newKey = (): string => `opt-${Date.now()}-${(counter += 1)}`;

export const fromApi = (item: {
  id: number;
  title?: string | null;
  message?: string | null;
  option?: string | number | null;
  parentId?: number | null;
}): QueueOptionNode => ({
  key: `id-${item.id}`,
  id: item.id,
  title: item.title ?? "",
  message: item.message ?? "",
  option: String(item.option ?? ""),
  parentId: item.parentId ?? null,
  editing: false,
  children: null
});

export const draft = (siblings: QueueOptionNode[], parentId: number | null): QueueOptionNode => ({
  key: newKey(),
  title: "",
  message: "",
  option: String(siblings.length + 1),
  parentId,
  editing: true,
  children: []
});

const mapAt = (
  nodes: QueueOptionNode[],
  path: Path,
  fn: (node: QueueOptionNode) => QueueOptionNode
): QueueOptionNode[] => {
  const [head, ...rest] = path;
  return nodes.map((node, index) => {
    if (index !== head) return node;
    if (rest.length === 0) return fn(node);
    return { ...node, children: mapAt(node.children ?? [], rest, fn) };
  });
};

export const getAt = (nodes: QueueOptionNode[], path: Path): QueueOptionNode | undefined => {
  const [head, ...rest] = path;
  const node = nodes[head];
  if (!node || rest.length === 0) return node;
  return getAt(node.children ?? [], rest);
};

export const updateAt = (
  nodes: QueueOptionNode[],
  path: Path,
  patch: Partial<QueueOptionNode>
): QueueOptionNode[] => mapAt(nodes, path, node => ({ ...node, ...patch }));

export const addChildAt = (nodes: QueueOptionNode[], path: Path): QueueOptionNode[] =>
  mapAt(nodes, path, node => {
    const children = node.children ?? [];
    return { ...node, children: [...children, draft(children, node.id ?? null)] };
  });

// Remove o nó e renumera as irmãs (1, 2, 3...). Devolve também as irmãs já
// salvas cujo número mudou, para gravar só essas.
export const removeAt = (
  nodes: QueueOptionNode[],
  path: Path
): { tree: QueueOptionNode[]; renumbered: QueueOptionNode[] } => {
  const renumbered: QueueOptionNode[] = [];
  const renumber = (siblings: QueueOptionNode[], index: number) =>
    siblings
      .filter((_, i) => i !== index)
      .map((node, i) => {
        const option = String(i + 1);
        if (node.option === option) return node;
        const next = { ...node, option };
        if (next.id) renumbered.push(next);
        return next;
      });
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  const tree =
    parentPath.length === 0
      ? renumber(nodes, index)
      : mapAt(nodes, parentPath, node => ({ ...node, children: renumber(node.children ?? [], index) }));
  return { tree, renumbered };
};
