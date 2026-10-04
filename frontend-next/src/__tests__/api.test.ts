import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { api, getAccessToken, refreshSession, setAccessToken, setOnSessionExpired } from "@/lib/api";

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data?: unknown };

// Adaptador falso: responde conforme a rota e registra as chamadas.
const calls: { url?: string; auth?: string }[] = [];
const useBackend = (handler: Handler) => {
  const adapter: AxiosAdapter = async config => {
    calls.push({ url: config.url, auth: config.headers?.Authorization as string | undefined });
    const { status, data } = handler(config);
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) throw new AxiosError("erro", String(status), config, null, response);
    return response;
  };
  api.defaults.adapter = adapter;
};

describe("sessão (api.ts)", () => {
  beforeEach(() => {
    calls.length = 0;
    setAccessToken(null);
    setOnSessionExpired(null);
  });

  it("guarda o token só em memória e o envia no cabeçalho", async () => {
    useBackend(() => ({ status: 200, data: { token: "t1", user: { id: 1 } } }));
    await refreshSession();
    expect(getAccessToken()).toBe("t1");
    expect(window.localStorage.getItem("token")).toBeNull();

    useBackend(() => ({ status: 200, data: [] }));
    await api.get("/settings");
    expect(calls.at(-1)?.auth).toBe("Bearer t1");
  });

  it("403: renova uma única vez para várias requisições e repete cada uma", async () => {
    setAccessToken("expirado");
    useBackend(config => {
      if (config.url === "/auth/refresh_token") return { status: 200, data: { token: "novo", user: {} } };
      const auth = config.headers?.Authorization;
      return auth === "Bearer novo" ? { status: 200, data: config.url } : { status: 403 };
    });

    const results = await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);

    expect(results.map(r => r.data)).toEqual(["/a", "/b", "/c"]);
    expect(calls.filter(c => c.url === "/auth/refresh_token")).toHaveLength(1);
    expect(getAccessToken()).toBe("novo");
  });

  it("403 depois da renovação é falta de permissão: não encerra a sessão", async () => {
    setAccessToken("valido");
    const expired = vi.fn();
    setOnSessionExpired(expired);
    useBackend(config =>
      config.url === "/auth/refresh_token" ? { status: 200, data: { token: "valido", user: {} } } : { status: 403 }
    );

    await expect(api.get("/admin")).rejects.toBeInstanceOf(AxiosError);
    expect(expired).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("valido");
  });

  it("refresh recusado: limpa o token e encerra a sessão", async () => {
    setAccessToken("expirado");
    const expired = vi.fn();
    setOnSessionExpired(expired);
    useBackend(config => (config.url === "/auth/refresh_token" ? { status: 401 } : { status: 403 }));

    await expect(api.get("/tickets")).rejects.toBeTruthy();
    expect(expired).toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it("401: encerra a sessão", async () => {
    setAccessToken("t");
    const expired = vi.fn();
    setOnSessionExpired(expired);
    useBackend(() => ({ status: 401 }));

    await expect(api.get("/tickets")).rejects.toBeTruthy();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });
});
