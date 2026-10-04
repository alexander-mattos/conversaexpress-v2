import {
  RESET_TOKEN_TTL_MS,
  buildStoredToken,
  generateResetToken,
  isResetTokenValid
} from "../../services/ForgotPassWordServices/PasswordResetToken";

describe("PasswordResetToken", () => {
  it("gera tokens aleatórios e diferentes", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a).toHaveLength(48);
    expect(a).not.toEqual(b);
  });

  it("não grava o token em texto puro", () => {
    const token = generateResetToken();
    expect(buildStoredToken(token)).not.toContain(token);
  });

  it("aceita o token correto dentro da validade", () => {
    const now = Date.now();
    const token = generateResetToken();
    const stored = buildStoredToken(token, now);
    expect(isResetTokenValid(token, stored, now + RESET_TOKEN_TTL_MS - 1)).toBe(true);
  });

  it("recusa token expirado", () => {
    const now = Date.now();
    const token = generateResetToken();
    const stored = buildStoredToken(token, now);
    expect(isResetTokenValid(token, stored, now + RESET_TOKEN_TTL_MS + 1)).toBe(false);
  });

  it("recusa token errado, vazio ou valor gravado malformado", () => {
    const stored = buildStoredToken(generateResetToken());
    expect(isResetTokenValid("outro-token", stored)).toBe(false);
    expect(isResetTokenValid("", stored)).toBe(false);
    expect(isResetTokenValid("x", null)).toBe(false);
    expect(isResetTokenValid("x", "lixo")).toBe(false);
    // Formato antigo (uuid em texto puro, sem validade) não é mais aceito.
    expect(isResetTokenValid("abc", "abc")).toBe(false);
  });

  it("recusa payloads de injeção de SQL como token", () => {
    const stored = buildStoredToken(generateResetToken());
    expect(isResetTokenValid("' OR '1'='1", stored)).toBe(false);
  });
});
