import Files from "../../models/Files";
import AppError from "../../errors/AppError";
import { removeFileListFolder } from "../../helpers/FileListStorage";

const DeleteService = async (id: string | number, companyId: number): Promise<void> => {
  const file = await Files.findOne({
    where: { id, companyId }
  });

  if (!file) {
    throw new AppError("ERR_NO_RATING_FOUND", 404);
  }

  await file.destroy();
  // Os arquivos da lista também saem do disco (antes ficavam públicos).
  removeFileListFolder(file.id);
};

export default DeleteService;
