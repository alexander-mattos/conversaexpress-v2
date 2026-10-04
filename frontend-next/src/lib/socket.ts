import { io, type Socket } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { BACKEND_URL, getAccessToken, refreshSession } from "./api";

type Listener = (...args: any[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

const isDev = process.env.NODE_ENV !== "production";

const isExpired = (token: string): boolean => {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return !!exp && Date.now() >= exp * 1000;
  } catch {
    return true;
  }
};

// Mesma API do SocketManager/ManagedSocket do frontend atual: on/off/emit, e
// os "join…" são reenviados ao reconectar.
export class ManagedSocket {
  private callbacks: { event: string; callback: Listener }[] = [];
  private joins: { event: string; params: unknown[] }[] = [];

  constructor(private readonly manager: SocketManager, private readonly raw: Socket) {
    raw.on("connect", () => {
      if (raw.recovered) return;
      const refreshJoinsOnReady = () => {
        for (const join of this.joins) raw.emit(`join${join.event}`, ...join.params);
        raw.off("ready", refreshJoinsOnReady);
      };
      for (const { event, callback } of this.callbacks) {
        raw.off(event, callback);
        raw.on(event, callback);
      }
      raw.on("ready", refreshJoinsOnReady);
    });
  }

  on(event: string, callback: Listener): void {
    if (event === "ready" || event === "connect") {
      this.manager.onReady(callback);
      return;
    }
    this.callbacks.push({ event, callback });
    this.raw.on(event, callback);
  }

  off(event: string, callback: Listener): void {
    this.callbacks = this.callbacks.filter(c => !(c.event === event && c.callback === callback));
    this.raw.off(event, callback);
  }

  emit(event: string, ...params: unknown[]): void {
    if (event.startsWith("join")) this.joins.push({ event: event.substring(4), params });
    this.raw.emit(event, ...params);
  }

  disconnect(): void {
    for (const join of this.joins) this.raw.emit(`leave${join.event}`, ...join.params);
    this.joins = [];
    for (const { event, callback } of this.callbacks) this.raw.off(event, callback);
    this.callbacks = [];
  }
}

class DummySocket {
  on(): void {}
  off(): void {}
  emit(): void {}
  disconnect(): void {}
}

export type AppSocket = ManagedSocket | DummySocket;

export class SocketManager {
  private current: Socket | null = null;
  private companyId: string | null = null;
  private userId: string | null = null;
  private ready = false;

  getSocket(companyId?: number | string | null, userId?: number | string | null): AppSocket {
    const token = getAccessToken();
    if (!companyId || !token) return new DummySocket();

    const company = String(companyId);
    const user = userId ? String(userId) : null;

    if (company !== this.companyId || user !== this.userId || !this.current) {
      this.close();
      this.companyId = company;
      this.userId = user;
      this.ready = false;

      // O token vai no "auth" do handshake (antes ia na query string, que fica
      // registrada em logs de proxy e servidor).
      const socket = io(BACKEND_URL, {
        transports: ["websocket"],
        auth: cb => cb({ token: getAccessToken() }),
        reconnection: true
      });
      socket.on("ready", () => {
        this.ready = true;
      });
      socket.on("connect_error", async () => {
        // Token expirado: renova a sessão; a reconexão automática usa o novo.
        const current = getAccessToken();
        if (!current || isExpired(current)) {
          try {
            await refreshSession();
          } catch {
            this.close();
          }
        }
      });
      if (isDev) socket.onAny((event, ...args) => console.debug("socket", event, args));
      this.current = socket;
    }

    return new ManagedSocket(this, this.current);
  }

  onReady(callback: Listener): void {
    if (this.ready) {
      callback();
      return;
    }
    this.current?.once("ready", callback);
  }

  close(): void {
    if (this.current) {
      this.current.removeAllListeners();
      this.current.disconnect();
    }
    this.current = null;
    this.companyId = null;
    this.userId = null;
    this.ready = false;
  }
}

export const socketManager = new SocketManager();
