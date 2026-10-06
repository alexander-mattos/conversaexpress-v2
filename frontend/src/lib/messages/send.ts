import type { Message } from "./types";

// Corpo do envio de texto (POST /messages/:ticketId), igual ao frontend atual:
// com assinatura, o nome do atendente vai em negrito na primeira linha.
export const buildTextMessage = (text: string, sign: boolean, userName: string, quoted: Message | null) => ({
  read: 1,
  fromMe: true,
  mediaUrl: "",
  body: sign ? `*${userName}:*\n${text.trim()}` : text.trim(),
  quotedMsg: quoted
});

// Arquivos: um campo "medias" por arquivo e o nome do arquivo como legenda.
export const buildMediaForm = (files: File[]): FormData => {
  const form = new FormData();
  form.append("fromMe", "true");
  for (const file of files) {
    form.append("medias", file);
    form.append("body", file.name);
  }
  return form;
};

// O backend envia como mensagem de voz os arquivos "audio-record-site-*".
export const AUDIO_MIN_BYTES = 10000;
export const audioFileName = (mimeType: string, now = Date.now()): string => {
  const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
  return `audio-record-site-${now}.${ext}`;
};

export const buildAudioForm = (blob: Blob, fileName: string): FormData => {
  const form = new FormData();
  form.append("medias", blob, fileName);
  form.append("body", fileName);
  form.append("fromMe", "true");
  return form;
};

// Resposta rápida com arquivo: o arquivo é enviado com o texto como legenda.
export const buildQuickMessageMediaForm = (blob: Blob, message: string, now = Date.now()): FormData => {
  const form = new FormData();
  const extension = blob.type.split("/")[1] || "bin";
  form.append("medias", blob, `${now}.${extension}`);
  form.append("body", message);
  form.append("fromMe", "true");
  return form;
};

export interface QuickMessageOption {
  value: string;
  label: string;
  mediaPath: string | null;
}

export const toQuickMessageOption = (m: { shortcode: string; message: string; mediaPath?: string | null }): QuickMessageOption => ({
  value: m.message,
  label: `/${m.shortcode} - ${m.message && m.message.length > 35 ? `${m.message.substring(0, 35)}...` : m.message}`,
  mediaPath: m.mediaPath ?? null
});

// Lista de respostas rápidas aparece quando o texto começa com "/".
export const filterQuickMessages = (input: string, options: QuickMessageOption[]): QuickMessageOption[] | null => {
  if (!input || input.length <= 1 || input.charAt(0) !== "/") return null;
  return options.filter(o => o.label.includes(input));
};
