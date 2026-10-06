"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Backdrop, CircularProgress } from "@mui/material";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";

// Área logada: sem sessão válida, volta para o login (como o Route.js atual).
export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuth, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuth) router.replace("/login");
  }, [isAuth, loading, router]);

  if (!isAuth) {
    return (
      <Backdrop open sx={{ zIndex: theme => theme.zIndex.drawer + 1, color: "#fff" }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  return <AppShell>{children}</AppShell>;
}
