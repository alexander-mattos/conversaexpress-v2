import { randomBytes } from "crypto";

// Senha inicial para admins de empresas criadas sem senha (16 caracteres,
// ~96 bits). Exibida uma única vez ao super admin e nunca armazenada em texto.
const generatePassword = (): string => randomBytes(12).toString("base64url");

export default generatePassword;
