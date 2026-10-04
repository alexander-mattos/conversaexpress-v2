import { messagesReducer, parseLocation, safeHttpUrl, safeImageSrc } from "@/lib/messages/reducer";
import {
  audioFileName,
  buildAudioForm,
  buildMediaForm,
  buildQuickMessageMediaForm,
  buildTextMessage,
  filterQuickMessages,
  toQuickMessageOption
} from "@/lib/messages/send";
import type { Message } from "@/lib/messages/types";

const msg = (id: string, extra: Partial<Message> = {}): Message => ({
  id,
  ticketId: 1,
  body: `m${id}`,
  fromMe: false,
  createdAt: "2026-10-04T10:00:00.000Z",
  ...extra
});

describe("reducer de mensagens", () => {
  it("páginas mais antigas entram antes, sem duplicar", () => {
    let state = messagesReducer([], { type: "LOAD_MESSAGES", payload: [msg("3"), msg("4")] });
    state = messagesReducer(state, { type: "LOAD_MESSAGES", payload: [msg("1"), msg("2"), msg("3", { body: "novo" })] });
    expect(state.map(m => m.id)).toEqual(["1", "2", "3", "4"]);
    expect(state[2].body).toBe("novo");
  });

  it("nova mensagem vai ao fim; atualização troca no lugar (ack, apagada)", () => {
    let state = messagesReducer([msg("1")], { type: "ADD_MESSAGE", payload: msg("2") });
    state = messagesReducer(state, { type: "ADD_MESSAGE", payload: msg("2", { ack: 1 }) });
    expect(state.map(m => m.id)).toEqual(["1", "2"]);
    state = messagesReducer(state, { type: "UPDATE_MESSAGE", payload: msg("2", { ack: 4, isDeleted: true }) });
    expect(state[1]).toMatchObject({ ack: 4, isDeleted: true });
    state = messagesReducer(state, { type: "UPDATE_MESSAGE", payload: msg("9") });
    expect(state).toHaveLength(2);
  });
});

describe("localização", () => {
  it("separa imagem, link e descrição", () => {
    expect(parseLocation("data:image/png;base64,xx|https://maps.google.com/?q=1|Rua A")).toEqual({
      image: "data:image/png;base64,xx",
      link: "https://maps.google.com/?q=1",
      description: "Rua A"
    });
    expect(parseLocation("sem separador")).toBeNull();
  });

  it("só aceita http(s) e imagens data:", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("https://exemplo.com/a")).toBe("https://exemplo.com/a");
    expect(safeImageSrc("data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA");
    expect(safeImageSrc("data:text/html,<script>")).toBeNull();
  });
});

describe("envio", () => {
  it("texto com e sem assinatura, com citação", () => {
    const quoted = msg("7");
    expect(buildTextMessage("  oi  ", true, "Ana", quoted)).toEqual({
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: "*Ana:*\noi",
      quotedMsg: quoted
    });
    expect(buildTextMessage("oi", false, "Ana", null).body).toBe("oi");
  });

  it("arquivos: um 'medias' e um 'body' (nome) por arquivo", () => {
    const form = buildMediaForm([new File(["a"], "a.pdf"), new File(["b"], "b.png")]);
    expect(form.getAll("medias").map(f => (f as File).name)).toEqual(["a.pdf", "b.png"]);
    expect(form.getAll("body")).toEqual(["a.pdf", "b.png"]);
    expect(form.get("fromMe")).toBe("true");
  });

  it("áudio gravado vai como mensagem de voz (prefixo audio-record-site)", () => {
    expect(audioFileName("audio/webm", 1)).toBe("audio-record-site-1.webm");
    expect(audioFileName("audio/ogg", 1)).toBe("audio-record-site-1.ogg");
    const form = buildAudioForm(new Blob(["x"], { type: "audio/webm" }), "audio-record-site-1.webm");
    expect((form.get("medias") as File).name).toBe("audio-record-site-1.webm");
    expect(form.get("body")).toBe("audio-record-site-1.webm");
  });

  it("resposta rápida com arquivo leva o texto como legenda", () => {
    const form = buildQuickMessageMediaForm(new Blob(["x"], { type: "image/png" }), "Segue o catálogo", 5);
    expect((form.get("medias") as File).name).toBe("5.png");
    expect(form.get("body")).toBe("Segue o catálogo");
  });

  it("respostas rápidas aparecem com '/' e filtram pelo atalho", () => {
    const options = [
      toQuickMessageOption({ shortcode: "ola", message: "Olá! Como posso ajudar?" }),
      toQuickMessageOption({ shortcode: "pix", message: "Nossa chave Pix é a do CNPJ, informada no rodapé do site oficial" })
    ];
    expect(options[1].label).toBe("/pix - Nossa chave Pix é a do CNPJ, inform...");
    expect(filterQuickMessages("/", options)).toBeNull();
    expect(filterQuickMessages("oi", options)).toBeNull();
    expect(filterQuickMessages("/pi", options)?.map(o => o.value)).toEqual([options[1].value]);
  });
});
