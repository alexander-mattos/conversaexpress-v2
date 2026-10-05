import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import { fileListUploadConfig } from "../config/upload";
import { assertExistsInCompany } from "../helpers/CompanyAccess";
import Files from "../models/Files";

import * as FilesController from "../controllers/FilesController";

const upload = multer(fileListUploadConfig);

// Confere a lista (empresa) ANTES do multer gravar qualquer arquivo.
const fileListInCompany = async (req: Request, res: Response, next: NextFunction) => {
  await assertExistsInCompany(Files, req.params.fileListId, req.user);
  next();
};

const filesRoutes = express.Router();

filesRoutes.get("/files/list", isAuth, FilesController.list);
filesRoutes.get("/files", isAuth, FilesController.index);
filesRoutes.post("/files", isAuth, isAdmin, FilesController.store);
filesRoutes.put("/files/:fileId", isAuth, isAdmin, FilesController.update);
filesRoutes.get("/files/:fileId", isAuth, FilesController.show);
filesRoutes.delete("/files/:fileId", isAuth, isAdmin, FilesController.remove);
filesRoutes.delete("/files", isAuth, isAdmin, FilesController.removeAll);
filesRoutes.post(
  "/files/uploadList/:fileListId",
  isAuth,
  isAdmin,
  fileListInCompany,
  upload.array("files"),
  FilesController.uploadMedias
);
export default filesRoutes;
