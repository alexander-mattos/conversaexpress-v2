"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { useTranslation } from "react-i18next";
import { buildTheme, type AppLanguage } from "@/theme/theme";
import type { ColorMode } from "@/theme/tokens";

const STORAGE_KEY = "preferredTheme";

interface ThemeModeValue {
  mode: ColorMode;
  toggleColorMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeValue>({ mode: "light", toggleColorMode: () => undefined });

export const useThemeMode = (): ThemeModeValue => useContext(ThemeModeContext);

// Mesma regra do frontend atual: preferência salva ou a do sistema.
const readStoredMode = (): ColorMode | null => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
};

const subscribeStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

// Mesma regra do frontend atual: preferência salva ou a do sistema.
export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)", { noSsr: true });
  // No servidor não há preferência salva; no navegador ela é lida do localStorage.
  const storedMode = useSyncExternalStore(subscribeStorage, readStoredMode, () => null);
  const [chosenMode, setChosenMode] = useState<ColorMode | null>(null);
  const mode: ColorMode = chosenMode ?? storedMode ?? (prefersDark ? "dark" : "light");
  const { i18n } = useTranslation();

  const toggleColorMode = useCallback(() => {
    const next: ColorMode = mode === "light" ? "dark" : "light";
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignora: vale para a sessão atual
    }
    setChosenMode(next);
  }, [mode]);

  const language = (i18n.language?.substring(0, 2) || "pt") as AppLanguage;
  const theme = useMemo(() => buildTheme(mode, language), [mode, language]);
  const value = useMemo(() => ({ mode, toggleColorMode }), [mode, toggleColorMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
