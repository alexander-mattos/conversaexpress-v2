import { describe, expect, it } from "vitest";
import { ALL_FLAGS, NO_FLAGS, effectiveFlags, planGuardDecision } from "@/lib/plan/planAccess";

const base = { allowedByPlan: true, profile: "admin", isSuper: false, adminOnly: true };

describe("planGuardDecision", () => {
  it("espera enquanto o plano carrega e quando a consulta falha (nunca nega por isso)", () => {
    expect(planGuardDecision({ ...base, status: "loading" })).toBe("wait");
    expect(planGuardDecision({ ...base, status: "error" })).toBe("wait");
    expect(planGuardDecision({ ...base, status: "error", allowedByPlan: false })).toBe("wait");
  });

  it("admin com o recurso no plano abre; sem o recurso volta ao início", () => {
    expect(planGuardDecision({ ...base, status: "ready" })).toBe("allow");
    expect(planGuardDecision({ ...base, status: "ready", allowedByPlan: false })).toBe("deny");
  });

  it("atendente não entra em tela de admin, mesmo com o recurso no plano", () => {
    expect(planGuardDecision({ ...base, profile: "user", status: "ready" })).toBe("deny");
    expect(planGuardDecision({ ...base, profile: "user", status: "loading" })).toBe("deny");
  });

  it("telas para todos os perfis (Kanban) só dependem do plano", () => {
    expect(planGuardDecision({ ...base, profile: "user", adminOnly: false, status: "ready" })).toBe("allow");
    expect(planGuardDecision({ ...base, profile: "user", adminOnly: false, status: "ready", allowedByPlan: false })).toBe("deny");
  });

  it("o super acessa tudo, com ou sem o recurso e mesmo antes do plano carregar", () => {
    for (const status of ["loading", "ready", "error"] as const) {
      expect(planGuardDecision({ ...base, isSuper: true, allowedByPlan: false, status })).toBe("allow");
    }
  });
});

describe("effectiveFlags", () => {
  it("o super vê todos os recursos; os demais, os do plano", () => {
    expect(effectiveFlags(NO_FLAGS, true)).toEqual(ALL_FLAGS);
    expect(effectiveFlags({ ...NO_FLAGS, useKanban: true }, false)).toEqual({ ...NO_FLAGS, useKanban: true });
  });
});
