"use client";

import { useEffect, type ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { I18nextProvider } from "react-i18next";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { detectLanguage, i18n } from "@/i18n";
import { ThemeModeProvider } from "@/contexts/ThemeModeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
  // Aplica o idioma salvo/do navegador depois de montar (o servidor usa pt).
  useEffect(() => {
    const language = detectLanguage();
    if (i18n.language !== language) i18n.changeLanguage(language);
  }, []);

  return (
    <AppRouterCacheProvider options={{ key: "css" }}>
      <I18nextProvider i18n={i18n}>
        <ThemeModeProvider>
          <AuthProvider>
            {children}
            <ToastContainer autoClose={3000} />
          </AuthProvider>
        </ThemeModeProvider>
      </I18nextProvider>
    </AppRouterCacheProvider>
  );
}
