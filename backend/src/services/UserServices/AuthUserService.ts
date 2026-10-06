import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import Setting from "../../models/Setting";
import { PUBLIC_SETTINGS } from "../../helpers/SettingsAccess";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  queues: Queue[];
  companyId: number;
}

interface Request {
  email: string;
  password: string;
}

interface Response {
  serializedUser: SerializedUser;
  token: string;
  refreshToken: string;
}

const AuthUserService = async ({
  email,
  password
}: Request): Promise<Response> => {
  const user = await User.findOne({
    where: { email },
    // Só as configurações públicas: antes o login devolvia todas, com os
    // tokens das integrações, para qualquer perfil.
    include: [
      "queues",
      {
        model: Company,
        include: [{ model: Setting, attributes: ["id", "key", "value"], where: { key: PUBLIC_SETTINGS }, required: false }]
      }
    ]
  });

  // Mesma resposta para usuário inexistente e senha errada, para não revelar
  // quais e-mails têm conta.
  if (!user || !(await user.checkPassword(password))) {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const serializedUser = await SerializeUser(user);

  return {
    serializedUser,
    token,
    refreshToken
  };
};

export default AuthUserService;
