import { proto } from "@whiskeysockets/baileys";

// O WhatsApp passou a identificar parte dos contatos por um ID interno
// ("xxxx@lid") em vez do telefone. A mensagem traz os dois quando possível:
// remoteJid/participant com o LID e senderPn/participantPn com o telefone.

type MessageKey = proto.IMessageKey & {
  senderPn?: string;
  participantPn?: string;
};

export const isLidJid = (jid?: string | null): boolean => !!jid && jid.endsWith("@lid");

// Tira o sufixo de dispositivo (":12") e mantém usuário@servidor.
export const normalizeJid = (jid?: string | null): string | undefined => {
  if (!jid) return undefined;
  const [user, server] = jid.split("@");
  if (!server) return undefined;
  return `${user.split(":")[0]}@${server}`;
};

export const jidDigits = (jid?: string | null): string => String(jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");

// Quem é o contato (1:1) ou o participante (grupo) desta mensagem.
// pnJid: telefone (número@s.whatsapp.net), quando conhecido.
// lidJid: o ID interno (xxxx@lid), quando a mensagem veio assim.
export const senderJids = (
  key: MessageKey,
  participant?: string | null
): { pnJid?: string; lidJid?: string } => {
  const isGroup = !!key.remoteJid?.endsWith("@g.us");
  const raw = normalizeJid(isGroup ? participant || key.participant : key.remoteJid);
  const pn = normalizeJid(isGroup ? key.participantPn : key.senderPn);

  if (isLidJid(raw)) {
    return { lidJid: raw, pnJid: pn && !isLidJid(pn) ? pn : undefined };
  }
  return { pnJid: raw };
};

interface JidContact {
  number: string;
  lid?: string | null;
  isGroup?: boolean;
}

// Para onde enviar ao contato: telefone quando conhecido; só o LID quando o
// WhatsApp ainda não informou o telefone (o Baileys entrega em xxxx@lid).
export const contactJid = (contact: JidContact, isGroup = !!contact.isGroup): string => {
  if (isGroup) return `${contact.number}@g.us`;
  if (contact.lid && (!contact.number || contact.number === jidDigits(contact.lid))) {
    return contact.lid;
  }
  return `${contact.number}@s.whatsapp.net`;
};
