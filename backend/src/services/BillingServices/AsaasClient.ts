import axios, { AxiosInstance } from "axios";
import AppError from "../../errors/AppError";
import { logger } from "../../utils/logger";

// Conta Asaas da plataforma (mensalidade das empresas). Não confundir com a
// configuração "asaas" de cada empresa, usada pelo chatbot de 2ª via.
export interface AsaasPayment {
  id: string;
  customer: string;
  status: string;
  value: number;
  externalReference?: string;
  invoiceUrl?: string;
}

export interface AsaasPixQrCode {
  payload: string;
  encodedImage: string;
  expirationDate?: string;
}

const baseURL = (): string =>
  process.env.ASAAS_API_URL ||
  (process.env.ASAAS_SANDBOX === "true" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3");

const client = (): AxiosInstance => {
  if (!process.env.ASAAS_API_KEY) {
    throw new AppError("ERR_BILLING_NOT_CONFIGURED", 500);
  }
  return axios.create({
    baseURL: baseURL(),
    timeout: 15000,
    headers: { access_token: process.env.ASAAS_API_KEY, "User-Agent": "ConversaExpress" }
  });
};

// Erros do Asaas viram AppError sem expor a chave nem a resposta completa.
const call = async <T>(op: string, fn: (api: AxiosInstance) => Promise<{ data: T }>): Promise<T> => {
  const api = client();
  try {
    const { data } = await fn(api);
    return data;
  } catch (err: any) {
    const status = err?.response?.status;
    const errors = err?.response?.data?.errors;
    logger.error(`Asaas ${op} falhou (${status ?? "sem resposta"}): ${JSON.stringify(errors ?? err?.message)}`);
    throw new AppError("ERR_BILLING_PROVIDER", 502);
  }
};

export const createCustomer = (data: {
  name: string;
  cpfCnpj: string;
  email?: string;
  externalReference: string;
}): Promise<{ id: string }> => call("createCustomer", api => api.post("/customers", data));

export const createPayment = (data: {
  customer: string;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
}): Promise<AsaasPayment> =>
  call("createPayment", api => api.post("/payments", { billingType: "UNDEFINED", ...data }));

export const getPayment = (id: string): Promise<AsaasPayment> =>
  call("getPayment", api => api.get(`/payments/${encodeURIComponent(id)}`));

export const getPixQrCode = (id: string): Promise<AsaasPixQrCode> =>
  call("getPixQrCode", api => api.get(`/payments/${encodeURIComponent(id)}/pixQrCode`));
