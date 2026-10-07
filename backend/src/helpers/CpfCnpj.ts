import AppError from "../errors/AppError";

// CPF/CNPJ: só dígitos e validação dos dígitos verificadores.
export const onlyDigits = (value: unknown): string => String(value ?? "").replace(/\D/g, "");

const allSame = (digits: string): boolean => /^(\d)\1+$/.test(digits);

const isValidCpf = (cpf: string): boolean => {
  if (cpf.length !== 11 || allSame(cpf)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
};

const isValidCnpj = (cnpj: string): boolean => {
  if (cnpj.length !== 14 || allSame(cnpj)) return false;
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13]);
};

export const isValidCpfCnpj = (value: unknown): boolean => {
  const digits = onlyDigits(value);
  return digits.length === 11 ? isValidCpf(digits) : isValidCnpj(digits);
};

// Entrada de formulário: undefined = não informado; "" = apagar (null);
// qualquer outro valor precisa ser um CPF/CNPJ válido.
export const parseDocument = (value: unknown, required = false): string | null | undefined => {
  if (value === undefined || value === null || String(value).trim() === "") {
    if (required) throw new AppError("ERR_INVALID_DOCUMENT", 400);
    return value === undefined ? undefined : null;
  }
  const digits = onlyDigits(value);
  if (!isValidCpfCnpj(digits)) throw new AppError("ERR_INVALID_DOCUMENT", 400);
  return digits;
};
