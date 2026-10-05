import AppError from "../../errors/AppError";

export interface FileOptionInput {
  id?: number;
  name: string;
}

// Do cliente vêm só o id (para editar uma opção existente) e o texto. O
// caminho e o tipo do arquivo são gravados apenas pelo upload.
export const parseFileOptions = (value: unknown): FileOptionInput[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new AppError("ERR_INVALID_FILE_OPTIONS", 400);
  return value.map(item => {
    const id = item?.id === undefined || item?.id === null || item?.id === "" ? undefined : Number(item.id);
    if (id !== undefined && !Number.isInteger(id)) throw new AppError("ERR_INVALID_FILE_OPTIONS", 400);
    return { id, name: String(item?.name ?? "") };
  });
};
