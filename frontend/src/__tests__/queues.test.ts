import { defaultSchedules, isValidTime, maskTime, normalizeSchedules } from "@/lib/queues/schedules";
import { addChildAt, draft, fromApi, getAt, removeAt, updateAt, type QueueOptionNode } from "@/lib/queues/optionTree";

describe("horários da fila", () => {
  it("padrão igual ao frontend atual", () => {
    const days = defaultSchedules();
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ weekday: "Segunda-feira", weekdayEn: "monday", startTime: "08:00", endTime: "18:00" });
    expect(days[5]).toMatchObject({ weekdayEn: "saturday", endTime: "12:00" });
    expect(days[6]).toMatchObject({ weekdayEn: "sunday", startTime: "00:00", endTime: "00:00" });
  });

  it("normaliza null, [] e ordem", () => {
    expect(normalizeSchedules(null)).toEqual(defaultSchedules());
    expect(normalizeSchedules([])).toEqual(defaultSchedules());
    const result = normalizeSchedules([{ weekdayEn: "sunday", startTime: "09:00", endTime: "10:00" }]);
    expect(result[6]).toMatchObject({ weekdayEn: "sunday", startTime: "09:00" });
    expect(result[0]).toMatchObject({ weekdayEn: "monday", startTime: "", endTime: "" });
  });

  it("máscara e validação HH:MM", () => {
    expect(maskTime("0830")).toBe("08:30");
    expect(maskTime("8a3")).toBe("83");
    expect(maskTime("123456")).toBe("12:34");
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("8:00")).toBe(false);
  });
});

describe("árvore de opções do chatbot", () => {
  const tree = (): QueueOptionNode[] => [
    { ...fromApi({ id: 1, title: "Vendas", option: 1 }), children: [fromApi({ id: 11, title: "Varejo", option: 1, parentId: 1 })] },
    fromApi({ id: 2, title: "Suporte", option: 2 }),
    fromApi({ id: 3, title: "Financeiro", option: 3 })
  ];

  it("atualiza sem mutar", () => {
    const original = tree();
    const next = updateAt(original, [0, 0], { title: "Atacado" });
    expect(getAt(next, [0, 0])?.title).toBe("Atacado");
    expect(getAt(original, [0, 0])?.title).toBe("Varejo");
  });

  it("adiciona filho numerado com o pai certo", () => {
    const next = addChildAt(tree(), [0]);
    expect(getAt(next, [0, 1])).toMatchObject({ option: "2", parentId: 1, editing: true });
  });

  it("remove e renumera só as irmãs salvas que mudaram", () => {
    const withDraft = [...tree(), draft(tree(), null)];
    const { tree: next, renumbered } = removeAt(withDraft, [1]);
    expect(next.map(n => n.option)).toEqual(["1", "2", "3"]);
    expect(renumbered.map(n => n.id)).toEqual([3]);
  });

  it("remove filho dentro da árvore", () => {
    const { tree: next } = removeAt(tree(), [0, 0]);
    expect(getAt(next, [0])?.children).toEqual([]);
    expect(next).toHaveLength(3);
  });
});
