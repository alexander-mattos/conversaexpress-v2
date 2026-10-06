import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { messages } from "./languages";

export const LANGUAGES = ["pt", "en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];
const STORAGE_KEY = "i18nextLng";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    debug: false,
    defaultNS: "translations",
    ns: ["translations"],
    resources: messages,
    // Começa em pt no servidor e no primeiro render; o idioma salvo é aplicado
    // no cliente (detectLanguage) para não divergir da renderização do servidor.
    lng: "pt",
    fallbackLng: "pt",
    interpolation: { escapeValue: false }
  });
}

const isLanguage = (value: string | null | undefined): value is Language =>
  !!value && (LANGUAGES as readonly string[]).includes(value);

export const detectLanguage = (): Language => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)?.substring(0, 2);
    if (isLanguage(saved)) return saved;
  } catch {
    // armazenamento indisponível: usa o navegador
  }
  const browser = window.navigator.language?.substring(0, 2);
  return isLanguage(browser) ? browser : "pt";
};

export const changeLanguage = (language: Language): void => {
  i18n.changeLanguage(language);
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // ignora: a troca vale para a sessão atual
  }
};

export { i18n };
