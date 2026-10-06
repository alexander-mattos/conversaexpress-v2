import { OPTIONS, addRecurrence, dueDateColor, isConfigured, looksLikeExternalUrl, settingValue, upsertSetting } from "@/lib/settings/settings";

describe("configurações", () => {
  const rows = [
    { key: "userRating", value: "enabled" },
    { key: "asaas", value: "", configured: true }
  ];

  it("valor, segredo configurado e atualização sem mutar", () => {
    expect(settingValue(rows, "userRating")).toBe("enabled");
    expect(settingValue(rows, "call")).toBe("");
    expect(isConfigured(rows, "asaas")).toBe(true);
    const next = upsertSetting(rows, { key: "userRating", value: "disabled" });
    expect(settingValue(next, "userRating")).toBe("disabled");
    expect(settingValue(rows, "userRating")).toBe("enabled");
    expect(upsertSetting(rows, { key: "call", value: "enabled" })).toHaveLength(3);
  });

  it("opções da tela iguais à lista branca da API", () => {
    expect(OPTIONS.map(o => o.key).sort()).toEqual(
      ["CheckMsgIsGroup", "call", "chatBotType", "scheduleType", "sendGreetingAccepted", "sendGreetingMessageOneQueues", "sendMsgTransfTicket", "userRating"].sort()
    );
  });

  it("URL de integração: só http(s) externa", () => {
    expect(looksLikeExternalUrl("")).toBe(true);
    expect(looksLikeExternalUrl("https://mk.exemplo.com")).toBe(true);
    for (const url of ["http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://172.16.0.1", "http://localhost:3000", "ftp://x.com", "10.0.0.5"]) {
      expect(looksLikeExternalUrl(url)).toBe(false);
    }
  });

  it("+ vencimento soma a recorrência (fim de mês ajustado)", () => {
    expect(addRecurrence("2026-01-31", "MENSAL")).toBe("2026-02-28");
    expect(addRecurrence("2026-10-06", "TRIMESTRAL")).toBe("2027-01-06");
    expect(addRecurrence("2026-10-06", "ANUAL")).toBe("2027-10-06");
    expect(addRecurrence("", "MENSAL")).toBe("");
  });

  it("cor da linha pelo vencimento", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    expect(dueDateColor("2026-10-11T12:00:00Z", now)).toBe("#fffead");
    expect(dueDateColor("2026-10-08T12:00:00Z", now)).toBe("#f7cc8f");
    expect(dueDateColor("2026-10-02T12:00:00Z", now)).toBe("#fa8c8c");
    expect(dueDateColor("2026-12-01T12:00:00Z", now)).toBeUndefined();
  });
});
