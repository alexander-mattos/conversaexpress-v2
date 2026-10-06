// Origens aceitas pelo CORS da API e do Socket.IO: FRONTEND_URL e as de
// FRONTEND_EXTRA_ORIGINS (separadas por vírgula), por exemplo uma homologação.
export const getAllowedOrigins = (env: NodeJS.ProcessEnv = process.env): string[] =>
  [env.FRONTEND_URL, ...(env.FRONTEND_EXTRA_ORIGINS || "").split(",")]
    .map(origin => (origin || "").trim().replace(/\/$/, ""))
    .filter((origin, index, all) => origin && all.indexOf(origin) === index);
