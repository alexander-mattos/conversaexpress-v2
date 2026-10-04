interface HandshakeLike {
  auth?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

// O frontend novo envia o token em handshake.auth (não fica em logs de URL).
// A query string continua aceita enquanto o frontend atual estiver no ar.
export const getHandshakeToken = (handshake: HandshakeLike): string | null => {
  const fromAuth = handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth) return fromAuth;

  const fromQuery = handshake.query?.token;
  if (typeof fromQuery === "string" && fromQuery) return fromQuery;

  return null;
};
