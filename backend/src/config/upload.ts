import path from "path";
import multer from "multer";
import fs from "fs";
import AppError from "../errors/AppError";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

// Subpastas aceitas em "typeArch". Qualquer outro valor é recusado para
// impedir gravação fora de public/ (path traversal).
export const ALLOWED_TYPE_ARCH = ["quickMessage", "fileList", "announcements"];

// Extensões que o navegador executaria se fossem abertas a partir de /public.
const BLOCKED_EXTENSIONS = [
  ".html", ".htm", ".xhtml", ".shtml", ".svg", ".svgz", ".xml", ".xsl",
  ".js", ".mjs", ".cjs", ".php", ".phtml", ".sh", ".exe", ".bat", ".cmd"
];

export const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // igual ao client_max_body_size do nginx

// Mantém o nome legível, mas só com caracteres seguros para disco e shell.
export const sanitizeFileName = (originalName: string): string => {
  const base = path.basename(String(originalName || "arquivo"));
  const cleaned = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^[.-]+/, "")
    .slice(-150);
  return cleaned || "arquivo";
};

export const isBlockedFile = (originalName: string): boolean =>
  BLOCKED_EXTENSIONS.includes(path.extname(String(originalName || "")).toLowerCase());

export const resolveUploadFolder = (typeArch?: string, fileId?: string): string => {
  if (!typeArch) return publicFolder;

  if (!ALLOWED_TYPE_ARCH.includes(typeArch)) {
    throw new AppError("ERR_INVALID_UPLOAD_TYPE", 400);
  }

  if (typeArch === "announcements" || !fileId) {
    return path.resolve(publicFolder, typeArch);
  }

  if (!/^\d+$/.test(String(fileId))) {
    throw new AppError("ERR_INVALID_UPLOAD_TYPE", 400);
  }

  return path.resolve(publicFolder, typeArch, String(fileId));
};

export default {
  directory: publicFolder,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
    files: 20
  },
  fileFilter(req, file, cb) {
    if (isBlockedFile(file.originalname)) {
      return cb(new AppError("ERR_INVALID_FILE_TYPE", 400));
    }
    return cb(null, true);
  },
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const { typeArch, fileId } = req.body;

      let folder: string;
      try {
        folder = resolveUploadFolder(typeArch, fileId);
      } catch (err) {
        return cb(err, "");
      }

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true, mode: 0o755 });
      }
      return cb(null, folder);
    },
    filename(req, file, cb) {
      const { typeArch } = req.body;
      const safeName = sanitizeFileName(file.originalname);

      // fileList fica numa pasta própria por lista. Os demais vão com
      // timestamp para um envio não sobrescrever o arquivo de outro registro
      // (ou de outra empresa) que tenha o mesmo nome.
      const fileName = typeArch === "fileList" ? safeName : `${new Date().getTime()}_${safeName}`;
      return cb(null, fileName);
    }
  })
};
