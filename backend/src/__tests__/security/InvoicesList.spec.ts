export {};

const findAll = jest.fn();
const isSuper = jest.fn();

jest.mock("../../models/Invoices", () => ({ __esModule: true, default: { findAll } }));
jest.mock("../../models/Company", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/User", () => ({ __esModule: true, default: { findByPk: (...a: any[]) => isSuper(...a) } }));
for (const path of ["services/PlanService/CreatePlanService", "services/PlanService/UpdatePlanService", "services/PlanService/ShowPlanService", "services/PlanService/DeletePlanService", "services/InvoicesService/ListInvoicesServices", "services/InvoicesService/ShowInvoiceService", "services/InvoicesService/UpdateInvoiceService"]) {
  jest.doMock(`../../${path}`, () => ({ __esModule: true, default: jest.fn() }));
}

/* eslint-disable @typescript-eslint/no-var-requires */
const { list } = require("../../controllers/InvoicesController");
const res = () => {
  const r: any = {};
  r.status = jest.fn(() => r);
  r.json = jest.fn(() => r);
  return r;
};

describe("GET /invoices/all", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findAll.mockResolvedValue([]);
  });

  it("admin vê só a própria empresa e não escolhe outra", async () => {
    isSuper.mockResolvedValue({ super: false });
    await list({ user: { id: 2, companyId: 7 }, query: {} }, res());
    expect(findAll.mock.calls[0][0].where).toEqual({ companyId: 7 });
    await expect(list({ user: { id: 2, companyId: 7 }, query: { companyId: "8" } }, res())).rejects.toMatchObject({ statusCode: 403 });
  });

  it("super vê todas, com o nome da empresa, ou filtra por uma", async () => {
    isSuper.mockResolvedValue({ super: true });
    await list({ user: { id: 1, companyId: 1 }, query: {} }, res());
    expect(findAll.mock.calls[0][0].where).toEqual({});
    expect(findAll.mock.calls[0][0].include[0]).toMatchObject({ as: "company", attributes: ["id", "name"] });
    await list({ user: { id: 1, companyId: 1 }, query: { companyId: "8" } }, res());
    expect(findAll.mock.calls[1][0].where).toEqual({ companyId: 8 });
  });
});
