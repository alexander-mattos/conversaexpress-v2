import { toast } from "react-toastify";
import { isAxiosError } from "axios";
import { i18n } from "@/i18n";

// Mesmo comportamento do toastError do frontend atual: traduz os códigos
// ERR_* do backend quando existem em backendErrors.
export const toastError = (err: unknown): void => {
  const code = isAxiosError(err) ? (err.response?.data as { error?: string } | undefined)?.error : undefined;
  if (code) {
    const key = `backendErrors.${code}`;
    toast.error(i18n.exists(key) ? i18n.t(key) : code, { toastId: code, autoClose: 2000 });
    return;
  }
  if (typeof err === "string") {
    toast.error(err);
  }
};
