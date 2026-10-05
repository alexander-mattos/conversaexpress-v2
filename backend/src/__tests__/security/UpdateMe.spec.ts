// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const showUser = jest.fn();
const findOne = jest.fn();

jest.mock("../../services/UserServices/ShowUserService", () => ({ __esModule: true, default: showUser }));
jest.mock("../../models/User", () => ({ __esModule: true, default: { findOne } }));

/* eslint-disable @typescript-eslint/no-var-requires */
const UpdateMeService = require("../../services/UserServices/UpdateMeService").default;

const makeUser = () => {
  const user: any = { id: 5, email: "ana@e2e.com", name: "Ana", profile: "user", tokenVersion: 2 };
  user.update = jest.fn(async (data: any) => Object.assign(user, data));
  user.reload = jest.fn();
  return user;
};

describe("PUT /users/me", () => {
  beforeEach(() => jest.clearAllMocks());

  it("altera só nome, e-mail e senha (perfil e filas ignorados)", async () => {
    const user = makeUser();
    showUser.mockResolvedValue(user);
    findOne.mockResolvedValue(null);
    await UpdateMeService({ userId: 5, name: "Ana Maria", email: "ana2@e2e.com", password: "segredo", profile: "admin", queueIds: [1] } as any);
    expect(user.update).toHaveBeenCalledWith({ name: "Ana Maria", email: "ana2@e2e.com", password: "segredo", tokenVersion: 3 });
    expect(user.profile).toBe("user");
  });

  it("recusa e-mail de outro usuário", async () => {
    showUser.mockResolvedValue(makeUser());
    findOne.mockResolvedValue({ id: 9 });
    await expect(UpdateMeService({ userId: 5, email: "outro@e2e.com" })).rejects.toMatchObject({ message: "ERR_EMAIL_ALREADY_EXISTS" });
  });

  it("sem senha, não invalida as sessões", async () => {
    const user = makeUser();
    showUser.mockResolvedValue(user);
    await UpdateMeService({ userId: 5, name: "Ana" });
    expect(user.update).toHaveBeenCalledWith({ name: "Ana" });
  });
});
