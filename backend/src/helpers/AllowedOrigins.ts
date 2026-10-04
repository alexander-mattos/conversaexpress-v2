// Origens aceitas pelo CORS da API e do Socket.IO: FRONTEND_URL e, durante a
// migração do frontend, as de FRONTEND_EXTRA_ORIGINS (separadas por vírgula),
// para o frontend atual e o frontend-next rodarem lado a lado.
export const getAllowedOrigins = (env: NodeJS.ProcessEnv = process.env): string[] =>
  [env.FRONTEND_URL, ...(env.FRONTEND_EXTRA_ORIGINS || "").split(",")]
    .map(origin => (origin || "").trim().replace(/\/$/, ""))
    .filter((origin, index, all) => origin && all.indexOf(origin) === index);
