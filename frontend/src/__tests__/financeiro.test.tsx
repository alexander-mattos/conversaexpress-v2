import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
let user = { id: 1, companyId: 1, super: true };
vi.mock("@/lib/api", () => ({ api: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/lib/socket", () => ({ socketManager: { getSocket: () => ({ on: vi.fn(), disconnect: vi.fn() }) } }));
vi.mock("@/lib/toastError", () => ({ toastError: vi.fn() }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import FinanceiroPage from "@/app/(app)/financeiro/page";
import { invoiceCompanies } from "@/lib/invoices/invoices";

const invoices = [
  { id: 1, detail: "Plano A", value: 10, dueDate: "2999-01-01", status: "open", companyId: 1, company: { id: 1, name: "Empresa 1" } },
  { id: 2, detail: "Plano B", value: 20, dueDate: "2999-01-01", status: "open", companyId: 2, company: { id: 2, name: "Acme" } }
];

describe("Financeiro", () => {
  beforeEach(() => get.mockResolvedValue({ data: invoices }));

  it("super vê a coluna Empresa e só paga as faturas da própria empresa", async () => {
    user = { id: 1, companyId: 1, super: true };
    render(<FinanceiroPage />);
    const rows = await screen.findAllByTestId("invoice-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByTestId("invoice-company")).toHaveTextContent("Empresa 1");
    expect(within(rows[0]).getByText("invoices.PAY")).toBeInTheDocument();
    expect(within(rows[1]).getByTestId("invoice-company")).toHaveTextContent("Acme");
    expect(within(rows[1]).queryByText("invoices.PAY")).toBeNull();
    expect(screen.getByTestId("invoice-company-filter")).toBeInTheDocument();
  });

  it("admin comum não vê a coluna Empresa nem o filtro", async () => {
    user = { id: 5, companyId: 1, super: false };
    get.mockResolvedValue({ data: [invoices[0]] });
    render(<FinanceiroPage />);
    await waitFor(() => expect(screen.getAllByTestId("invoice-row")).toHaveLength(1));
    expect(screen.queryByTestId("invoice-company")).toBeNull();
    expect(screen.queryByTestId("invoice-company-filter")).toBeNull();
  });

  it("lista de empresas do filtro, sem repetir e em ordem", () => {
    expect(invoiceCompanies([...invoices, { ...invoices[1], id: 3 }] as never)).toEqual([
      { id: 2, name: "Acme" },
      { id: 1, name: "Empresa 1" }
    ]);
  });
});
