import {
  canCancel,
  canDelete,
  canEdit,
  canRestart,
  formatDateTime,
  fromLocalInput,
  isValidVariableKey,
  parseSettings,
  reportCounts,
  toLocalInput,
  type Campaign
} from "@/lib/campaigns/campaigns";

describe("campanhas: regras de status (iguais às da API)", () => {
  it("editar: inativa, cancelada ou programada com mais de 1h", () => {
    const now = new Date("2026-10-06T12:00:00Z").getTime();
    expect(canEdit({ status: "INATIVA" }, now)).toBe(true);
    expect(canEdit({ status: "CANCELADA" }, now)).toBe(true);
    expect(canEdit({ status: "PROGRAMADA", scheduledAt: "2026-10-06T14:00:00Z" }, now)).toBe(true);
    expect(canEdit({ status: "PROGRAMADA", scheduledAt: "2026-10-06T12:30:00Z" }, now)).toBe(false);
    expect(canEdit({ status: "EM_ANDAMENTO" }, now)).toBe(false);
    expect(canEdit({ status: "FINALIZADA" }, now)).toBe(false);
  });

  it("cancelar, reiniciar e excluir", () => {
    expect(canCancel("PROGRAMADA") && canCancel("EM_ANDAMENTO")).toBe(true);
    expect(canCancel("FINALIZADA")).toBe(false);
    expect(canRestart("CANCELADA")).toBe(true);
    expect(canRestart("FINALIZADA")).toBe(false);
    expect(canDelete("EM_ANDAMENTO")).toBe(false);
  });
});

describe("campanhas: datas", () => {
  it("datetime-local ida e volta no fuso do navegador", () => {
    const iso = fromLocalInput("2026-10-06T15:30");
    expect(iso).not.toBeNull();
    expect(toLocalInput(iso)).toBe("2026-10-06T15:30");
    expect(fromLocalInput("")).toBeNull();
    expect(toLocalInput(null)).toBe("");
    expect(formatDateTime(iso)).toBe("06/10/2026 15:30");
  });
});

describe("campanhas: relatório e configurações", () => {
  it("válidos e entregues", () => {
    const campaign = {
      id: 1,
      name: "x",
      status: "EM_ANDAMENTO",
      contactList: { id: 1, name: "L", contacts: [{ id: 1, isWhatsappValid: true }, { id: 2, isWhatsappValid: true }, { id: 3, isWhatsappValid: false }] },
      shipping: [{ id: 1, deliveredAt: "2026-10-06" }, { id: 2, deliveredAt: null }]
    } as Campaign;
    expect(reportCounts(campaign)).toEqual({ valid: 2, delivered: 1, percent: 50 });
    expect(reportCounts(null)).toEqual({ valid: 0, delivered: 0, percent: 0 });
  });

  it("valor que não é JSON fica com o padrão (a tela atual quebrava)", () => {
    const settings = parseSettings([
      { key: "messageInterval", value: "5" },
      { key: "greaterInterval", value: "não-json" },
      { key: "variables", value: JSON.stringify([{ key: "loja", value: "Centro" }]) }
    ]);
    expect(settings).toEqual({ messageInterval: 5, longerIntervalAfter: 20, greaterInterval: 60, variables: [{ key: "loja", value: "Centro" }] });
  });

  it("atalho de variável", () => {
    expect(isValidVariableKey("loja_1")).toBe(true);
    expect(isValidVariableKey("a b")).toBe(false);
    expect(isValidVariableKey("x(")).toBe(false);
  });
});
