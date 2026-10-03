import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";

const isSuper = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const user = await User.findByPk(req.user.id, { attributes: ["id", "super"] });
  if (!user?.super) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return next();
}

export default isSuper;
