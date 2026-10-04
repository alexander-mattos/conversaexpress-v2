import { listReducer } from "@/lib/listReducer";
import { contactsCsv, rowsToObjects, toUploadRows } from "@/lib/contacts/sheet";
import { loadTodos, saveTodos, todosKey } from "@/lib/todos";

type Item = { id: number; name: string };

describe("listReducer", () => {
  const a = { id: 1, name: "a" };
  const b = { id: 2, name: "b" };

  it("LOAD acrescenta sem duplicar e atualiza os já carregados", () => {
    const state = listReducer<Item>([a], { type: "LOAD", payload: [{ id: 1, name: "a2" }, b] });
    expect(state).toEqual([{ id: 1, name: "a2" }, b]);
  });

  it("UPSERT substitui o existente ou põe o novo no topo", () => {
    expect(listReducer<Item>([a, b], { type: "UPSERT", payload: { id: 2, name: "b2" } })).toEqual([a, { id: 2, name: "b2" }]);
    expect(listReducer<Item>([a], { type: "UPSERT", payload: b })).toEqual([b, a]);
  });

  it("DELETE aceita id em texto e não muta o estado", () => {
    const state = [a, b];
    expect(listReducer<Item>(state, { type: "DELETE", payload: "1" })).toEqual([b]);
    expect(state).toEqual([a, b]);
  });

  it("RESET esvazia", () => {
    expect(listReducer<Item>([a], { type: "RESET" })).toEqual([]);
  });
});

describe("planilha de contatos", () => {
  it("usa a primeira linha como cabeçalho e ignora linhas vazias", () => {
    const rows = [
      ["Nome", "Telefone", null],
      ["Ana", 5511999990000, null],
      [null, "", null],
      ["Bia", "5511888880000", "x"]
    ];
    expect(rowsToObjects(rows)).toEqual([
      { Nome: "Ana", Telefone: 5511999990000 },
      { Nome: "Bia", Telefone: "5511888880000" }
    ]);
  });

  it("converte telefone numérico para texto", () => {
    expect(toUploadRows([{ Nome: "Ana", Telefone: 5511999990000 }, { Nome: undefined }])).toEqual([
      { Nome: "Ana", Telefone: "5511999990000" },
      { Nome: "", Telefone: "" }
    ]);
  });

  it("gera CSV com BOM, ponto e vírgula e aspas quando preciso", () => {
    const csv = contactsCsv([
      { name: "Ana; Souza", number: "55", email: "a@a.com" },
      { name: 'Bia "B"', number: "56" }
    ]);
    expect(csv).toBe('﻿name;number;email\r\n"Ana; Souza";55;a@a.com\r\n"Bia ""B""";56;');
  });
});

describe("tarefas por usuário", () => {
  beforeEach(() => window.localStorage.clear());

  it("migra a lista antiga uma vez para quem abrir primeiro", () => {
    window.localStorage.setItem("tasks", JSON.stringify([{ text: "antiga", createdAt: "2024-01-01T10:00:00.000Z", updatedAt: "2024-01-02T10:00:00.000Z" }]));
    const first = loadTodos(window.localStorage, 1, 10);
    expect(first).toEqual([{ text: "antiga", createdAt: "2024-01-01T10:00:00.000Z", updatedAt: "2024-01-02T10:00:00.000Z" }]);
    expect(window.localStorage.getItem("tasks")).toBeNull();
    expect(loadTodos(window.localStorage, 1, 11)).toEqual([]);
    expect(loadTodos(window.localStorage, 1, 10)).toEqual(first);
  });

  it("guarda separado por empresa e usuário", () => {
    const todo = { text: "x", createdAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z" };
    saveTodos(window.localStorage, 2, 20, [todo]);
    expect(window.localStorage.getItem(todosKey(2, 20))).toBe(JSON.stringify([todo]));
    expect(loadTodos(window.localStorage, 2, 21)).toEqual([]);
  });

  it("ignora dados corrompidos e corrige datas inválidas", () => {
    window.localStorage.setItem(todosKey(3, 30), "{nope");
    expect(loadTodos(window.localStorage, 3, 30)).toEqual([]);
    window.localStorage.setItem(todosKey(3, 31), JSON.stringify([{ text: "t", createdAt: "x" }, { foo: 1 }]));
    const [only, ...rest] = loadTodos(window.localStorage, 3, 31);
    expect(rest).toEqual([]);
    expect(only.text).toBe("t");
    expect(Number.isNaN(new Date(only.updatedAt).getTime())).toBe(false);
  });
});
