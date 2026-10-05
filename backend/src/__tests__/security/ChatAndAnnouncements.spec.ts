// Módulo próprio: sem isto, as constantes de arquivos de teste diferentes
// colidem na checagem de tipos do ts-jest (TS2451).
export {};

const chatFindByPk = jest.fn();
const userCount = jest.fn();
const userFindByPk = jest.fn();
const createMessage = jest.fn();
const deleteChat = jest.fn();
const updateChat = jest.fn();
const showAnnouncement = jest.fn();
const emits: { room: string; event: string; payload: any }[] = [];

jest.mock("../../libs/socket", () => ({
  getIO: () => ({
    to: (room: string) => ({ emit: (event: string, payload: any) => emits.push({ room, event, payload }) }),
    emit: (event: string, payload: any) => emits.push({ room: "*", event, payload })
  })
}));
jest.mock("../../models/Chat", () => ({ __esModule: true, default: { findByPk: chatFindByPk } }));
jest.mock("../../models/ChatUser", () => ({ __esModule: true, default: {} }));
jest.mock("../../models/User", () => ({ __esModule: true, default: { count: userCount, findByPk: userFindByPk } }));
jest.mock("../../models/Announcement", () => ({ __esModule: true, default: {} }));
jest.mock("../../services/ChatService/CreateMessageService", () => ({ __esModule: true, default: createMessage }));
jest.mock("../../services/ChatService/DeleteService", () => ({ __esModule: true, default: deleteChat }));
jest.mock("../../services/ChatService/UpdateService", () => ({ __esModule: true, default: updateChat }));
jest.mock("../../services/AnnouncementService/ShowService", () => ({ __esModule: true, default: showAnnouncement }));
for (const service of [
  "ChatService/CreateService",
  "ChatService/ListService",
  "ChatService/ShowFromUuidService",
  "ChatService/FindMessages",
  "AnnouncementService/ListService",
  "AnnouncementService/CreateService",
  "AnnouncementService/UpdateService",
  "AnnouncementService/DeleteService",
  "AnnouncementService/FindService"
]) {
  jest.doMock(`../../services/${service}`, () => ({ __esModule: true, default: jest.fn() }));
}

/* eslint-disable @typescript-eslint/no-var-requires */
const ChatController = require("../../controllers/ChatController");
const AnnouncementController = require("../../controllers/AnnouncementController");
const { parseChatUserIds, CHAT_USER_ATTRIBUTES, chatIncludes } = require("../../helpers/ChatAccess");
const { parseAnnouncement } = require("../../helpers/AnnouncementInput");
const { isImageFile } = require("../../config/upload");

const response = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};
const ana = { id: 1, companyId: 7, profile: "user" };
const chat = (members: number[], extra: Record<string, unknown> = {}) => ({
  id: 10,
  companyId: 7,
  ownerId: 1,
  users: members.map(userId => ({ userId, update: jest.fn() })),
  ...extra
});

beforeEach(() => {
  jest.clearAllMocks();
  emits.length = 0;
});

describe("chat interno: só participantes", () => {
  it("quem não participa não posta (403)", async () => {
    chatFindByPk.mockResolvedValue(chat([2, 3]));
    await expect(ChatController.saveMessage({ params: { id: "10" }, body: { message: "oi" }, user: ana }, response())).rejects.toMatchObject({
      statusCode: 403
    });
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("chat de outra empresa (403)", async () => {
    chatFindByPk.mockResolvedValue(chat([1], { companyId: 99 }));
    await expect(ChatController.messages({ params: { id: "10" }, query: {}, user: ana }, response())).rejects.toMatchObject({ statusCode: 403 });
  });

  it("mensagem vai só para a sala de cada participante", async () => {
    chatFindByPk.mockResolvedValue(chat([1, 2]));
    createMessage.mockResolvedValue({ id: 5, message: "segredo" });
    await ChatController.saveMessage({ params: { id: "10" }, body: { message: " segredo " }, user: ana }, response());
    expect(createMessage).toHaveBeenCalledWith({ chatId: 10, senderId: 1, message: "segredo" });
    expect(emits.length).toBeGreaterThan(0);
    expect(emits.every(e => e.room === "user-1" || e.room === "user-2")).toBe(true);
    expect(emits.some(e => e.room.includes("mainchannel"))).toBe(false);
  });

  it("mensagem vazia é recusada", async () => {
    chatFindByPk.mockResolvedValue(chat([1]));
    await expect(ChatController.saveMessage({ params: { id: "10" }, body: { message: "   " }, user: ana }, response())).rejects.toMatchObject({
      message: "ERR_CHAT_MESSAGE_REQUIRED"
    });
  });

  it("só o dono apaga ou edita", async () => {
    chatFindByPk.mockResolvedValue(chat([1, 2], { ownerId: 2 }));
    await expect(ChatController.remove({ params: { id: "10" }, user: ana }, response())).rejects.toMatchObject({ statusCode: 403 });
    await expect(ChatController.update({ params: { id: "10" }, body: { title: "x" }, user: ana }, response())).rejects.toMatchObject({
      statusCode: 403
    });
    expect(deleteChat).not.toHaveBeenCalled();
    expect(updateChat).not.toHaveBeenCalled();
  });

  it("marcar como lido usa o usuário do token", async () => {
    const current = chat([1, 2]);
    chatFindByPk.mockResolvedValue(current);
    await ChatController.checkAsRead({ params: { id: "10" }, body: { userId: 2 }, user: ana }, response());
    expect(current.users[0].update).toHaveBeenCalledWith({ unreads: 0 });
    expect(current.users[1].update).not.toHaveBeenCalled();
  });

  it("participantes de outra empresa são recusados", async () => {
    userCount.mockResolvedValue(1);
    await expect(parseChatUserIds([{ id: 2 }, { id: 50 }], 7)).rejects.toMatchObject({ statusCode: 403 });
    userCount.mockResolvedValue(2);
    await expect(parseChatUserIds([{ id: 2 }, 2, { id: 3 }], 7)).resolves.toEqual([2, 3]);
  });

  it("dados de usuário no chat: só id e nome (sem hash de senha)", () => {
    expect(CHAT_USER_ATTRIBUTES).toEqual(["id", "name"]);
    const [owner, users] = chatIncludes();
    expect(owner.attributes).toEqual(["id", "name"]);
    expect(users.include[0].attributes).toEqual(["id", "name"]);
  });
});

describe("informativos", () => {
  it("só campos editáveis e validados", () => {
    expect(parseAnnouncement({ title: " Aviso ", text: "Texto", companyId: 9, mediaPath: "../x" }, true)).toEqual({
      title: "Aviso",
      text: "Texto",
      priority: 3,
      status: true
    });
    expect(() => parseAnnouncement({ title: "A", text: "B", priority: 9 }, true)).toThrow("ERR_ANNOUNCEMENT_INVALID");
    expect(() => parseAnnouncement({ title: "", text: "B" }, true)).toThrow("ERR_ANNOUNCEMENT_REQUIRED");
    expect(parseAnnouncement({ status: "false" }, false)).toEqual({ status: false });
  });

  it("inativo não aparece para quem não é super", async () => {
    showAnnouncement.mockResolvedValue({ id: 1, status: false });
    userFindByPk.mockResolvedValue({ super: false });
    await expect(AnnouncementController.show({ params: { id: "1" }, user: ana }, response())).rejects.toMatchObject({ statusCode: 404 });
    userFindByPk.mockResolvedValue({ super: true });
    const res = response();
    await AnnouncementController.show({ params: { id: "1" }, user: ana }, res);
    expect(res.json).toHaveBeenCalledWith({ id: 1, status: false });
  });

  it("imagem do informativo: só png, jpg e webp", () => {
    expect(isImageFile({ originalname: "a.png", mimetype: "image/png" })).toBe(true);
    expect(isImageFile({ originalname: "a.jpg", mimetype: "image/jpeg" })).toBe(true);
    expect(isImageFile({ originalname: "a.pdf", mimetype: "application/pdf" })).toBe(false);
    expect(isImageFile({ originalname: "a.png", mimetype: "text/html" })).toBe(false);
  });
});
