export {};

const count = jest.fn();
jest.mock("../../models/Invoices", () => ({ __esModule: true, default: { count } }));

/* eslint-disable @typescript-eslint/no-var-requires */
const { isCompanyInTrial, withTrialFlag } = require("../../helpers/CompanyBilling");

describe("período de teste", () => {
  beforeEach(() => count.mockReset());

  it("está em teste enquanto não houver fatura paga", async () => {
    count.mockResolvedValue(0);
    expect(await isCompanyInTrial(7)).toBe(true);
    expect(count.mock.calls[0][0]).toEqual({ where: { companyId: 7, status: "paid" } });
    count.mockResolvedValue(2);
    expect(await isCompanyInTrial(7)).toBe(false);
  });

  it("acrescenta trial ao company do usuário (objeto simples ou model)", async () => {
    count.mockResolvedValue(0);
    const plain = await withTrialFlag({ id: 1, companyId: 7, company: { id: 7, dueDate: "2026-10-14" } });
    expect(plain.company).toEqual({ id: 7, dueDate: "2026-10-14", trial: true });
    count.mockResolvedValue(1);
    const model = await withTrialFlag({ id: 1, companyId: 7, company: { toJSON: () => ({ id: 7 }) } });
    expect(model.company).toEqual({ id: 7, trial: false });
    expect(await withTrialFlag({ id: 1, companyId: 7, company: null })).toEqual({ id: 1, companyId: 7, company: null });
  });
});
