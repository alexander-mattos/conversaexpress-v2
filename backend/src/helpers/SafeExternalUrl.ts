import dns from "dns/promises";
import net from "net";
import AppError from "../errors/AppError";

// URL de integração (n8n, webhook, typebot) é chamada pelo servidor: sem esta
// checagem, quem configura a integração consegue fazer o backend acessar
// endereços internos (localhost, rede privada, metadados da nuvem).
// INTEGRATION_ALLOWED_HOSTS (lista separada por vírgula) libera hosts
// específicos, por exemplo um n8n na mesma rede.

const allowedHosts = (): string[] =>
  (process.env.INTEGRATION_ALLOWED_HOSTS || "")
    .split(",")
    .map(host => host.trim().toLowerCase())
    .filter(Boolean);

const ipv4ToNumber = (ip: string): number =>
  ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;

const inRange = (ip: string, cidr: string): boolean => {
  const [base, bits] = cidr.split("/");
  const mask = bits === "0" ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(base) & mask);
};

const BLOCKED_V4 = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "224.0.0.0/4",
  "240.0.0.0/4"
];

export const isPrivateAddress = (address: string): boolean => {
  const ip = address.replace(/^\[|\]$/g, "");
  if (net.isIPv4(ip)) return BLOCKED_V4.some(cidr => inRange(ip, cidr));
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb") ||
      lower.startsWith("ff")
    );
  }
  return false;
};

// Formato e host (sem DNS): usado ao salvar a integração.
export const parseExternalUrl = (value: string): URL => {
  let url: URL;
  try {
    url = new URL(String(value).trim());
  } catch {
    throw new AppError("ERR_INTEGRATION_INVALID_URL", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("ERR_INTEGRATION_INVALID_URL", 400);
  }
  if (url.username || url.password) {
    throw new AppError("ERR_INTEGRATION_INVALID_URL", 400);
  }
  const host = url.hostname.toLowerCase();
  if (allowedHosts().includes(host)) return url;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || isPrivateAddress(host)) {
    throw new AppError("ERR_INTEGRATION_URL_NOT_ALLOWED", 400);
  }
  return url;
};

// Formato + resolução de DNS: usado antes de cada chamada, porque um nome
// público pode apontar para um IP interno.
export const assertSafeExternalUrl = async (value: string): Promise<URL> => {
  const url = parseExternalUrl(value);
  const host = url.hostname.toLowerCase();
  if (allowedHosts().includes(host) || net.isIP(host.replace(/^\[|\]$/g, ""))) return url;
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new AppError("ERR_INTEGRATION_INVALID_URL", 400);
  }
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new AppError("ERR_INTEGRATION_URL_NOT_ALLOWED", 400);
  }
  return url;
};
