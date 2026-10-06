import { daysUntil, formatBRL, formatDay, invoiceStatus } from "@/lib/invoices/invoices";

describe("faturas", () => {
  const now = new Date("2026-10-06T15:00:00Z");

  it("status: paga, vencida ou em aberto (igual ao atual)", () => {
    expect(invoiceStatus({ status: "paid", dueDate: "2020-01-01" }, now)).toBe("paid");
    expect(invoiceStatus({ status: "open", dueDate: "2026-10-05" }, now)).toBe("expired");
    expect(invoiceStatus({ status: "open", dueDate: "2026-10-06" }, now)).toBe("open");
    expect(invoiceStatus({ status: "open", dueDate: "2026-12-01" }, now)).toBe("open");
  });

  it("valor e data", () => {
    expect(formatBRL(99.9).replace(/\s/g, " ")).toBe("R$ 99,90");
    expect(formatDay("2026-12-01")).toBe("01/12/2026");
    expect(formatDay("2026-12-01T00:00:00.000Z")).toBe("01/12/2026");
    expect(formatDay("")).toBe("");
  });

  it("dias até o vencimento", () => {
    expect(daysUntil("2026-10-16", now)).toBe(10);
    expect(daysUntil("2026-10-01", now)).toBe(-5);
    expect(daysUntil(null, now)).toBeNull();
  });
});
