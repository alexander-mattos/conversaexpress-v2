import fs from "fs";
import path from "path";
import { fileListFolder } from "../config/upload";
import { logger } from "../utils/logger";

// Caminho de um arquivo da lista, sempre dentro da pasta da lista: o nome
// gravado no banco nunca sai dela (antes, "../../.env" era aceito e a
// campanha enviava o arquivo do servidor).
export const fileListPath = (fileListId: number | string, fileName: string): string =>
  path.resolve(fileListFolder(fileListId), path.basename(String(fileName || "")));

export const removeFileListFile = (fileListId: number | string, fileName?: string | null): void => {
  if (!fileName) return;
  try {
    fs.rmSync(fileListPath(fileListId, fileName), { force: true });
  } catch (err) {
    logger.warn(`Não foi possível apagar o arquivo ${fileName} da lista ${fileListId}: ${err}`);
  }
};

export const removeFileListFolder = (fileListId: number | string): void => {
  try {
    fs.rmSync(fileListFolder(fileListId), { recursive: true, force: true });
  } catch (err) {
    logger.warn(`Não foi possível apagar a pasta da lista ${fileListId}: ${err}`);
  }
};
