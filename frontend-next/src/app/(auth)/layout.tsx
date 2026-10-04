"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// Telas públicas: quem abre já logado vai para o painel (como o Route.js atual).
// Só vale para a sessão restaurada ao abrir a página; depois de um login, o
// próprio login decide o destino (/tickets).
export default function AuthLayout({ children }: { children: ReactNode }) {
  const { isAuth, loading } = useAuth();
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (loading || checked.current) return;
    checked.current = true;
    if (isAuth) router.replace("/");
  }, [isAuth, loading, router]);

  return <>{children}</>;
}
