import { QueryTypes } from "sequelize";
import { hash } from "bcryptjs";
import database from "../../database";
import AppError from "../../errors/AppError";
import { isResetTokenValid } from "../ForgotPassWordServices/PasswordResetToken";

interface UserResetData {
  id: number;
  resetPassword: string | null;
}

export const MIN_PASSWORD_LENGTH = 8;

const ResetPassword = async (
  email: string,
  token: string,
  password: string
): Promise<void> => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError("ERR_PASSWORD_TOO_SHORT", 400);
  }

  const users = await database.query<UserResetData>(
    `SELECT id, "resetPassword" FROM "Users" WHERE email = :email LIMIT 1`,
    { type: QueryTypes.SELECT, replacements: { email } }
  );
  const user = users[0];

  // Mesma resposta para e-mail inexistente e token inválido ou expirado.
  if (!user || !isResetTokenValid(token, user.resetPassword)) {
    throw new AppError("ERR_INVALID_RESET_TOKEN", 400);
  }

  const passwordHash = await hash(password, 10);

  // O valor validado entra no WHERE: se outro pedido gravou um código novo
  // entre a validação e este UPDATE, nenhuma linha muda e o código antigo
  // não é aceito. Incrementar tokenVersion invalida os refresh tokens.
  const affectedRows = await database.query(
    `UPDATE "Users"
        SET "passwordHash" = :passwordHash,
            "resetPassword" = NULL,
            "tokenVersion" = COALESCE("tokenVersion", 0) + 1
      WHERE id = :id AND "resetPassword" = :storedToken`,
    {
      type: QueryTypes.BULKUPDATE,
      replacements: { passwordHash, id: user.id, storedToken: user.resetPassword }
    }
  );

  if (Number(affectedRows) !== 1) {
    throw new AppError("ERR_INVALID_RESET_TOKEN", 400);
  }
};

export default ResetPassword;
