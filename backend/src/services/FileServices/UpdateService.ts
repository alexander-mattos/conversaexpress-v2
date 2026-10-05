import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Files from "../../models/Files";
import FilesOptions from "../../models/FilesOptions";
import ShowService from "./ShowService";
import { FileOptionInput } from "./FileOptionsInput";
import { removeFileListFile } from "../../helpers/FileListStorage";

interface FileData {
  id?: number;
  name: string;
  message: string;
  options?: FileOptionInput[];
}

interface Request {
  fileData: FileData;
  id: string | number;
  companyId: number;
}

const UpdateService = async ({
  fileData,
  id,
  companyId
}: Request): Promise<Files | undefined> => {
  const file = await ShowService(id, companyId);

  const schema = Yup.object().shape({
    name: Yup.string().min(3)
  });

  const { name, message, options } = fileData;

  try {
    await schema.validate({ name });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (options) {
    const current = new Map(file.options.map(option => [option.id, option]));
    const kept = new Set<number>();
    for (const info of options) {
      if (info.id !== undefined) {
        const existing = current.get(info.id);
        // Só opções desta lista podem ser editadas.
        if (!existing) throw new AppError("ERR_INVALID_FILE_OPTIONS", 400);
        await existing.update({ name: info.name });
        kept.add(info.id);
      } else {
        await FilesOptions.create({ name: info.name, fileId: file.id, path: "", mediaType: "" });
      }
    }
    for (const old of file.options) {
      if (!kept.has(old.id)) {
        removeFileListFile(file.id, old.path);
        await old.destroy();
      }
    }
  }

  await file.update({
    name,
    message
  });

  await file.reload({
    attributes: ["id", "name", "message","companyId"],
    include: ["options"]
  });
  return file;
};

export default UpdateService;
