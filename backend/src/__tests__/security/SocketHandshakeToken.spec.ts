import { getHandshakeToken } from "../../helpers/SocketHandshakeToken";

describe("getHandshakeToken", () => {
  it("prefere o token enviado em handshake.auth (frontend novo)", () => {
    expect(getHandshakeToken({ auth: { token: "novo" }, query: { token: "antigo" } })).toBe("novo");
  });

  it("aceita a query string (frontend atual, até a virada)", () => {
    expect(getHandshakeToken({ auth: {}, query: { token: "antigo" } })).toBe("antigo");
  });

  it("devolve null sem token ou com tipo inválido", () => {
    expect(getHandshakeToken({})).toBeNull();
    expect(getHandshakeToken({ auth: { token: 123 }, query: { token: ["a"] } })).toBeNull();
  });
});
