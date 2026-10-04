const findOne = jest.fn();
jest.mock("../../models/Message", () => ({ __esModule: true, default: { findOne } }));

import { getStoredMessage } from "../../helpers/GetStoredMessage";

describe("getStoredMessage", () => {
  beforeEach(() => findOne.mockReset());

  it("devolve o conteúdo salvo em dataJson", async () => {
    findOne.mockResolvedValue({
      dataJson: JSON.stringify({ key: { id: "ABC" }, message: { conversation: "oi" } })
    });
    await expect(getStoredMessage({ id: "ABC", remoteJid: "5511@s.whatsapp.net" })).resolves.toEqual({
      conversation: "oi"
    });
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "ABC" } }));
  });

  it("devolve undefined sem id, sem registro ou com JSON inválido", async () => {
    await expect(getStoredMessage({})).resolves.toBeUndefined();
    findOne.mockResolvedValueOnce(null);
    await expect(getStoredMessage({ id: "X" })).resolves.toBeUndefined();
    findOne.mockResolvedValueOnce({ dataJson: "{quebrado" });
    await expect(getStoredMessage({ id: "Y" })).resolves.toBeUndefined();
  });
});
