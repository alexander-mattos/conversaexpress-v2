import Files from "../../models/Files";
import { removeFileListFolder } from "../../helpers/FileListStorage";

// Apaga só as listas da empresa (antes, "where: {}" apagava as de todas).
const DeleteAllService = async (companyId: number): Promise<void> => {
  const files = await Files.findAll({ where: { companyId }, attributes: ["id"] });

  await Files.destroy({ where: { companyId } });
  files.forEach(file => removeFileListFolder(file.id));
};

export default DeleteAllService;
