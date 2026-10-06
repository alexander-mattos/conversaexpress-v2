import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

// O access token vive só em memória (nunca no localStorage, onde qualquer XSS
// o leria). Ao recarregar a página, ele é obtido de novo pelo cookie httpOnly
// de refresh (jrt) com POST /auth/refresh_token.
let accessToken: string | null = null;
export const getAccessToken = (): string | null => accessToken;
export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

let onSessionExpired: (() => void) | null = null;
export const setOnSessionExpired = (handler: (() => void) | null): void => {
  onSessionExpired = handler;
};

export const api = axios.create({ baseURL: BACKEND_URL, withCredentials: true });
export const openApi = axios.create({ baseURL: BACKEND_URL });

export interface RefreshResponse<TUser = unknown> {
  token: string;
  user: TUser;
}

// Uma única renovação por vez: requisições que falham juntas esperam a mesma.
let refreshing: Promise<RefreshResponse> | null = null;
export const refreshSession = <TUser = unknown>(): Promise<RefreshResponse<TUser>> => {
  if (!refreshing) {
    refreshing = api
      .post<RefreshResponse>("/auth/refresh_token")
      .then(({ data }) => {
        setAccessToken(data.token);
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing as Promise<RefreshResponse<TUser>>;
};

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Interceptors registrados uma única vez (o frontend atual os registrava a
// cada render).
api.interceptors.request.use(config => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes("/auth/refresh_token");

    // 403 = access token expirado/inválido: renova e repete uma vez.
    if (status === 403 && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch (refreshError) {
        setAccessToken(null);
        onSessionExpired?.();
        return Promise.reject(refreshError);
      }
    }

    // 401 = sessão encerrada. Um 403 depois da renovação é falta de
    // permissão e não derruba a sessão (antes deslogava o usuário).
    if (status === 401 && !isRefreshCall) {
      setAccessToken(null);
      onSessionExpired?.();
    }

    return Promise.reject(error);
  }
);
