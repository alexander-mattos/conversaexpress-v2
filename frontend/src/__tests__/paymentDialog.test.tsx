import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("@/lib/api", () => ({ api: { post: (...args: unknown[]) => post(...args) } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: 1, companyId: 7 } }) }));
vi.mock("@/lib/socket", () => ({ socketManager: { getSocket: () => ({ on: vi.fn(), disconnect: vi.fn() }) } }));
vi.mock("@/lib/toastError", () => ({ toastError: vi.fn() }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import PaymentDialog from "@/components/invoices/PaymentDialog";

const invoice = { id: 9, detail: "Plano", value: 99.9, dueDate: "2999-01-10", status: "open" } as never;
const documentRequired = () =>
  new AxiosError("400", "ERR", undefined, undefined, {
    status: 400,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { error: "ERR_DOCUMENT_REQUIRED" }
  });

describe("PaymentDialog", () => {
  beforeEach(() => post.mockReset());

  it("pede o CPF/CNPJ quando a empresa não tem e depois mostra Pix e link", async () => {
    post.mockRejectedValueOnce(documentRequired()).mockResolvedValueOnce({
      data: { pix: { payload: "000201PIX" }, invoiceUrl: "https://asaas/i/1" }
    });
    render(<PaymentDialog invoice={invoice} onClose={() => undefined} onPaid={() => undefined} />);

    fireEvent.click(screen.getByText("invoices.pix.generate"));
    const input = await screen.findByTestId("payment-document");
    const submit = screen.getByRole("button", { name: "invoices.pix.generate" });

    fireEvent.change(input, { target: { value: "52998224724" } });
    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: "52998224725" } });
    expect((input as HTMLInputElement).value).toBe("529.982.247-25");
    fireEvent.click(submit);

    await waitFor(() => expect(screen.getByTestId("pix-code")).toHaveValue("000201PIX"));
    expect(post.mock.calls[0][1]).toEqual({ invoiceId: 9 });
    expect(post.mock.calls[1][1]).toEqual({ invoiceId: 9, cpfCnpj: "52998224725" });
    expect(screen.getByTestId("payment-invoice-url")).toHaveAttribute("href", "https://asaas/i/1");
  });

  it("empresa com documento vai direto para o Pix", async () => {
    post.mockResolvedValueOnce({ data: { pix: { payload: "PIX2" }, invoiceUrl: "https://asaas/i/2" } });
    render(<PaymentDialog invoice={invoice} onClose={() => undefined} onPaid={() => undefined} />);
    fireEvent.click(screen.getByText("invoices.pix.generate"));
    await waitFor(() => expect(screen.getByTestId("pix-code")).toHaveValue("PIX2"));
    expect(screen.queryByTestId("payment-document")).toBeNull();
  });
});
