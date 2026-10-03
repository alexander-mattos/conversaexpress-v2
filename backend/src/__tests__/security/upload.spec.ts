import path from "path";
import uploadConfig, {
  isBlockedFile,
  resolveUploadFolder,
  sanitizeFileName
} from "../../config/upload";

describe("upload: nome de arquivo", () => {
  it("remove caracteres que permitiriam injeção de comando", () => {
    const name = sanitizeFileName("a;rm -rf ~;$(id)`whoami`|x&.mp3");
    expect(name).toMatch(/^[a-zA-Z0-9._-]+$/);
    expect(name.endsWith(".mp3")).toBe(true);
  });

  it("descarta diretórios e pontos iniciais (path traversal)", () => {
    expect(sanitizeFileName("../../.env")).toBe("env");
    expect(sanitizeFileName("..\\..\\x.png")).not.toContain("\\");
    expect(sanitizeFileName("/etc/passwd")).toBe("passwd");
  });

  it("mantém nomes comuns legíveis", () => {
    expect(sanitizeFileName("relatório de março.pdf")).toBe("relatorio_de_marco.pdf");
    expect(sanitizeFileName("")).toBe("arquivo");
  });
});

describe("upload: tipos bloqueados", () => {
  it("bloqueia conteúdo que o navegador executaria", () => {
    ["x.html", "x.HTM", "x.svg", "x.js", "x.xhtml"].forEach(name =>
      expect(isBlockedFile(name)).toBe(true)
    );
  });

  it("permite mídias e documentos", () => {
    ["foto.jpg", "audio.ogg", "video.mp4", "doc.pdf", "planilha.xlsx"].forEach(name =>
      expect(isBlockedFile(name)).toBe(false)
    );
  });
});

describe("upload: pasta de destino", () => {
  const root = uploadConfig.directory;

  it("usa public/ quando não há typeArch", () => {
    expect(resolveUploadFolder()).toBe(root);
  });

  it("aceita apenas typeArch da lista", () => {
    expect(resolveUploadFolder("quickMessage")).toBe(path.join(root, "quickMessage"));
    expect(resolveUploadFolder("fileList", "12")).toBe(path.join(root, "fileList", "12"));
    expect(() => resolveUploadFolder("../../etc")).toThrow();
    expect(() => resolveUploadFolder("outra")).toThrow();
  });

  it("exige fileId numérico", () => {
    expect(() => resolveUploadFolder("fileList", "../../x")).toThrow();
    expect(() => resolveUploadFolder("fileList", "1;rm")).toThrow();
  });

  it("nunca resolve para fora de public/", () => {
    const folder = resolveUploadFolder("fileList", "99");
    expect(folder.startsWith(root + path.sep)).toBe(true);
  });
});
