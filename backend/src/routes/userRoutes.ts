import { Router } from "express";

import isAuth from "../middleware/isAuth";
import isAdmin from "../middleware/isAdmin";
import * as UserController from "../controllers/UserController";

const userRoutes = Router();

userRoutes.get("/users", isAuth, UserController.index);

userRoutes.get("/users/list", isAuth, UserController.list);

userRoutes.post("/users", isAuth, UserController.store);

// Antes de "/users/:userId": o próprio usuário edita nome, e-mail e senha.
userRoutes.put("/users/me", isAuth, UserController.updateMe);

userRoutes.put("/users/:userId", isAuth, UserController.update);

userRoutes.get("/users/:userId", isAuth, UserController.show);

userRoutes.delete("/users/:userId", isAuth, UserController.remove);

userRoutes.post("/users/set-language/:newLanguage", isAuth, isAdmin, UserController.setLanguage);

export default userRoutes;
