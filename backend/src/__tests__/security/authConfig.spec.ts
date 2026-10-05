// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

describe("config/auth", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    jest.resetModules();
  });

  it("não usa segredo padrão quando JWT_SECRET falta", () => {
    delete process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = "refresh";
    expect(() => require("../../config/auth")).toThrow(/JWT_SECRET/);
  });

  it("carrega os segredos do ambiente", () => {
    process.env.JWT_SECRET = "a";
    process.env.JWT_REFRESH_SECRET = "b";
    const config = require("../../config/auth").default;
    expect(config.secret).toBe("a");
    expect(config.refreshSecret).toBe("b");
  });
});
