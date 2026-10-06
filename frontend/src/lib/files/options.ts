// Linhas do modal de lista de arquivos (texto + arquivo de cada opção).
export interface FileRow {
  key: string;
  id?: number;
  name: string;
  path?: string | null;
  file?: File | null;
}

export interface SavedOption {
  id: number;
  name: string;
  path?: string | null;
}

// Depois de salvar, as linhas novas (sem id) ganham os ids das opções criadas,
// na ordem em que foram criadas. Antes o arquivo ia para a opção na mesma
// posição da resposta, que não tem ordem garantida.
export const assignSavedIds = (rows: FileRow[], saved: SavedOption[]): FileRow[] => {
  const known = new Set(rows.filter(row => row.id).map(row => row.id));
  const created = saved.filter(option => !known.has(option.id)).sort((a, b) => a.id - b.id);
  let next = 0;
  return rows.map(row => (row.id ? row : { ...row, id: created[next++]?.id }));
};

// Envio dos arquivos escolhidos: um "files" e um "id" por arquivo.
export const buildUploadForm = (rows: FileRow[]): FormData | null => {
  const withFile = rows.filter(row => row.file && row.id);
  if (withFile.length === 0) return null;
  const form = new FormData();
  for (const row of withFile) {
    form.append("files", row.file as File);
    form.append("id", String(row.id));
    form.append("mediaType", (row.file as File).type);
  }
  return form;
};
