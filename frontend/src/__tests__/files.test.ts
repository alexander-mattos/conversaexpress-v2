import { assignSavedIds, buildUploadForm, type FileRow } from "@/lib/files/options";
import { listReducer } from "@/lib/listReducer";

describe("lista de arquivos", () => {
  it("linhas novas recebem os ids criados, na ordem de criação", () => {
    const rows: FileRow[] = [
      { key: "a", id: 10, name: "Existente" },
      { key: "b", name: "Novo 1" },
      { key: "c", name: "Novo 2" }
    ];
    // A resposta não garante ordem.
    const saved = [
      { id: 31, name: "Novo 2" },
      { id: 10, name: "Existente" },
      { id: 30, name: "Novo 1" }
    ];
    expect(assignSavedIds(rows, saved).map(row => row.id)).toEqual([10, 30, 31]);
  });

  it("envia só as linhas com arquivo, com o id de cada uma", () => {
    const file = new File(["x"], "catalogo.pdf", { type: "application/pdf" });
    const form = buildUploadForm([
      { key: "a", id: 10, name: "Sem arquivo" },
      { key: "b", id: 30, name: "Com arquivo", file }
    ]);
    expect(form?.getAll("id")).toEqual(["30"]);
    expect(form?.getAll("mediaType")).toEqual(["application/pdf"]);
    expect((form?.get("files") as File).name).toBe("catalogo.pdf");
    expect(buildUploadForm([{ key: "a", id: 1, name: "x" }])).toBeNull();
  });
});

describe("listReducer PATCH", () => {
  it("atualiza só os campos enviados", () => {
    const state = [{ id: 1, name: "WA", status: "qrcode" }];
    expect(listReducer(state, { type: "PATCH", payload: { id: 1, status: "CONNECTED" } })).toEqual([{ id: 1, name: "WA", status: "CONNECTED" }]);
    expect(listReducer(state, { type: "PATCH", payload: { id: 2, status: "x" } })).toEqual(state);
  });
});
