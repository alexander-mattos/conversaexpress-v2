import { appendMessage, applyChatEvent, prependMessages, secondaryText, totalUnreads, unreadsFor, type Chat } from "@/lib/chats/chats";
import { hasUnseen, markSeen, readSeen } from "@/lib/announcements/announcements";

const chat = (id: number, extra: Partial<Chat> = {}): Chat => ({ id, uuid: `u${id}`, title: `Chat ${id}`, ownerId: 1, ...extra });

describe("chat interno", () => {
  it("não lidos do usuário", () => {
    const list = [chat(1, { users: [{ userId: 1, unreads: 2 }, { userId: 2, unreads: 0 }] }), chat(2, { users: [{ userId: 1, unreads: 1 }] }), chat(3)];
    expect(unreadsFor(list[0], 1)).toBe(2);
    expect(unreadsFor(list[2], 1)).toBe(0);
    expect(totalUnreads(list, 1)).toBe(3);
  });

  it("eventos: novo entra, mensagem sobe, delete sai, sem mutar", () => {
    const list = [chat(1), chat(2)];
    const created = applyChatEvent(list, { action: "create", record: chat(3) });
    expect(created.map(c => c.id)).toEqual([3, 1, 2]);
    const moved = applyChatEvent(list, { action: "new-message", chat: chat(2, { lastMessage: "Ana: oi" }) });
    expect(moved.map(c => c.id)).toEqual([2, 1]);
    expect(moved[0].lastMessage).toBe("Ana: oi");
    expect(list[1].lastMessage).toBeUndefined();
    expect(applyChatEvent(list, { action: "delete", id: "1" }).map(c => c.id)).toEqual([2]);
    expect(applyChatEvent(list, { action: "update", chat: chat(1, { title: "Novo" }) })[0].title).toBe("Novo");
  });

  it("mensagens sem duplicar", () => {
    const m = (id: number) => ({ id, chatId: 1, senderId: 1, message: String(id), createdAt: "2026-10-05T10:00:00Z" });
    expect(appendMessage([m(1)], m(1))).toHaveLength(1);
    expect(appendMessage([m(1)], m(2)).map(x => x.id)).toEqual([1, 2]);
    expect(prependMessages([m(3), m(4)], [m(1), m(2), m(3)]).map(x => x.id)).toEqual([1, 2, 3, 4]);
  });

  it("texto secundário sem 'null'", () => {
    expect(secondaryText(chat(1, { lastMessage: null }))).toBe("");
    expect(secondaryText(chat(1, { lastMessage: "Ana: oi", updatedAt: "2026-10-05T13:30:00" }))).toBe("05/10/2026 13:30: Ana: oi");
  });
});

describe("informativos: lido por usuário", () => {
  beforeEach(() => window.localStorage.clear());
  const a = (id: number, updatedAt: string) => ({ id, title: "t", text: "x", priority: 3, status: true, updatedAt });

  it("bolinha só para novo ou alterado, separado por usuário", () => {
    const items = [a(1, "2026-10-01"), a(2, "2026-10-02")];
    expect(hasUnseen(items, readSeen(window.localStorage, 7))).toBe(true);
    markSeen(window.localStorage, 7, items);
    expect(hasUnseen(items, readSeen(window.localStorage, 7))).toBe(false);
    expect(hasUnseen(items, readSeen(window.localStorage, 8))).toBe(true);
    expect(hasUnseen([...items.slice(0, 1), a(2, "2026-10-05")], readSeen(window.localStorage, 7))).toBe(true);
    expect(hasUnseen([...items, a(3, "2026-10-05")], readSeen(window.localStorage, 7))).toBe(true);
  });

  it("armazenamento corrompido não quebra", () => {
    window.localStorage.setItem("announcements:seen:7", "{x");
    expect(readSeen(window.localStorage, 7)).toEqual({});
  });
});
