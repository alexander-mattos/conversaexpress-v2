// Sem fallback: um segredo padrão permitiria forjar tokens de qualquer usuário.
const requireSecret = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} não configurado. Defina-o no .env do backend.`);
  }
  return value;
};

export default {
  secret: requireSecret("JWT_SECRET"),
  expiresIn: "15m",
  refreshSecret: requireSecret("JWT_REFRESH_SECRET"),
  refreshExpiresIn: "7d"
};
