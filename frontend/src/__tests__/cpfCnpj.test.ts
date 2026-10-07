import { describe, expect, it } from "vitest";
import { formatCpfCnpj, isValidCpfCnpj } from "@/lib/billing/cpfCnpj";

describe("cpfCnpj", () => {
  it("valida CPF e CNPJ", () => {
    expect(isValidCpfCnpj("529.982.247-25")).toBe(true);
    expect(isValidCpfCnpj("11222333000181")).toBe(true);
    expect(isValidCpfCnpj("529.982.247-24")).toBe(false);
    expect(isValidCpfCnpj("00000000000")).toBe(false);
    expect(isValidCpfCnpj("11.222.333/0001-80")).toBe(false);
    expect(isValidCpfCnpj("")).toBe(false);
  });

  it("formata enquanto digita", () => {
    expect(formatCpfCnpj("5299")).toBe("529.9");
    expect(formatCpfCnpj("52998224725")).toBe("529.982.247-25");
    expect(formatCpfCnpj("112223330001")).toBe("11.222.333/0001");
    expect(formatCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatCpfCnpj("11222333000181999")).toBe("11.222.333/0001-81");
  });
});
