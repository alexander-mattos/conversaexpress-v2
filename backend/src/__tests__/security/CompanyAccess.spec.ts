const findByPk = jest.fn();
jest.mock("../../models/User", () => ({ __esModule: true, default: { findByPk } }));

import {
  assertCompanyAccess,
  isSameCompany,
  resolveCompanyId
} from "../../helpers/CompanyAccess";

const user = { id: 10, companyId: 1 };

describe("CompanyAccess", () => {
  beforeEach(() => findByPk.mockReset());

  it("compara companyId independente de tipo", () => {
    expect(isSameCompany("1", 1)).toBe(true);
    expect(isSameCompany(2, 1)).toBe(false);
    expect(isSameCompany(null, 1)).toBe(false);
    expect(isSameCompany(undefined, 1)).toBe(false);
  });

  it("permite registro da própria empresa sem consultar o banco", async () => {
    await expect(assertCompanyAccess(1, user)).resolves.toBeUndefined();
    expect(findByPk).not.toHaveBeenCalled();
  });

  it("bloqueia registro de outra empresa para usuário comum", async () => {
    findByPk.mockResolvedValue({ super: false });
    await expect(assertCompanyAccess(2, user)).rejects.toMatchObject({
      message: "ERR_NO_PERMISSION",
      statusCode: 403
    });
  });

  it("permite outra empresa apenas para super admin", async () => {
    findByPk.mockResolvedValue({ super: true });
    await expect(assertCompanyAccess(2, user)).resolves.toBeUndefined();
  });

  it("resolveCompanyId ignora ?companyId de outra empresa para usuário comum", async () => {
    findByPk.mockResolvedValue({ super: false });
    await expect(resolveCompanyId(undefined, user)).resolves.toBe(1);
    await expect(resolveCompanyId("1", user)).resolves.toBe(1);
    await expect(resolveCompanyId("2", user)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("resolveCompanyId aceita outra empresa para super admin", async () => {
    findByPk.mockResolvedValue({ super: true });
    await expect(resolveCompanyId("2", user)).resolves.toBe(2);
  });
});
