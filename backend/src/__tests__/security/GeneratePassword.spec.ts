import generatePassword from "../../helpers/GeneratePassword";

describe("generatePassword", () => {
  it("gera senha forte de 16 caracteres, diferente a cada chamada", () => {
    const a = generatePassword();
    const b = generatePassword();
    expect(a).toHaveLength(16);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toEqual(b);
    expect(a).not.toEqual("123456");
  });
});
