const query = jest.fn();
jest.mock("../../database", () => ({ __esModule: true, default: { query } }));

import ResetPassword from "../../services/ResetPasswordService/ResetPassword";
import {
  buildStoredToken,
  generateResetToken
} from "../../services/ForgotPassWordServices/PasswordResetToken";

describe("ResetPassword", () => {
  const token = generateResetToken();
  const stored = buildStoredToken(token);

  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValueOnce([{ id: 7, resetPassword: stored }]);
  });

  it("troca a senha só se o código validado ainda for o gravado", async () => {
    query.mockResolvedValueOnce(1);
    await expect(ResetPassword("a@b.com", token, "SenhaForte1")).resolves.toBeUndefined();

    const [sql, options] = query.mock.calls[1];
    expect(sql).toMatch(/"resetPassword" = :storedToken/);
    expect(options.replacements).toMatchObject({ id: 7, storedToken: stored });
  });

  it("recusa quando outro pedido substituiu o código antes do UPDATE", async () => {
    query.mockResolvedValueOnce(0);
    await expect(ResetPassword("a@b.com", token, "SenhaForte1")).rejects.toMatchObject({
      message: "ERR_INVALID_RESET_TOKEN"
    });
  });

  it("recusa código errado sem tentar o UPDATE", async () => {
    await expect(ResetPassword("a@b.com", "outro", "SenhaForte1")).rejects.toMatchObject({
      message: "ERR_INVALID_RESET_TOKEN"
    });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
