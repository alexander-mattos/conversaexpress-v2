import { Op } from "sequelize";
import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import User from "../../models/User";
import ShowUserService from "./ShowUserService";

interface Request {
  userId: string | number;
  name?: string;
  email?: string;
  password?: string;
}

// O próprio usuário altera nome, e-mail e senha. Perfil, filas, conexão e
// permissões continuam só com o admin (PUT /users/:id).
const UpdateMeService = async ({ userId, name, email, password }: Request) => {
  const user = await ShowUserService(userId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2, "ERR_INVALID_NAME").max(50, "ERR_INVALID_NAME"),
    email: Yup.string()
      .email("ERR_INVALID_EMAIL")
      .test("unique-email", "ERR_EMAIL_ALREADY_EXISTS", async value => {
        if (!value || value === user.email) return true;
        const other = await User.findOne({ where: { email: value, id: { [Op.ne]: user.id } } });
        return !other;
      }),
    password: Yup.string().min(5, "ERR_INVALID_PASSWORD").max(50, "ERR_INVALID_PASSWORD")
  });

  try {
    await schema.validate({ name, email, password: password || undefined });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await user.update({
    ...(name !== undefined ? { name } : {}),
    ...(email !== undefined ? { email } : {}),
    // Troca de senha invalida os refresh tokens já emitidos.
    ...(password ? { password, tokenVersion: (user.tokenVersion || 0) + 1 } : {})
  });
  await user.reload();

  return SerializeUser(user);
};

export default UpdateMeService;
