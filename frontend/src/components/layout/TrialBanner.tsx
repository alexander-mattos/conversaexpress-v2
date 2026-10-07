"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Alert, Button } from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import { socketManager } from "@/lib/socket";
import { TRIAL_DISMISS_KEY, trialInfo } from "@/lib/billing/trial";

const readDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(TRIAL_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

// Aviso fixo abaixo do header durante o teste. No último dia fica vermelho,
// sem botão de fechar e com o atalho para o Financeiro.
export default function TrialBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [paid, setPaid] = useState(false);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    const onPayment = () => setPaid(true);
    socket.on(`company-${companyId}-payment`, onPayment);
    return () => {
      socket.off(`company-${companyId}-payment`, onPayment);
    };
  }, [companyId, userId]);

  const info = trialInfo(user);
  if (!info || paid || (dismissed && !info.lastDay)) return null;

  const close = () => {
    try {
      sessionStorage.setItem(TRIAL_DISMISS_KEY, "1");
    } catch {
      // sem sessionStorage: fecha só nesta tela
    }
    setDismissed(true);
  };

  const date = format(info.dueDate, "dd/MM/yyyy");
  return (
    <Alert
      severity={info.lastDay ? "error" : "warning"}
      variant={info.lastDay ? "filled" : "standard"}
      square
      onClose={info.lastDay ? undefined : close}
      data-testid="trial-banner"
      data-lastday={info.lastDay ? "true" : "false"}
      action={
        info.lastDay ? (
          <Button component={Link} href="/financeiro" color="inherit" size="small" variant="outlined" data-testid="trial-banner-pay">
            {t("trialBanner.pay")}
          </Button>
        ) : undefined
      }
      sx={{ borderRadius: 0, alignItems: "center" }}
    >
      {info.lastDay
        ? t("trialBanner.lastDay", { date })
        : t("trialBanner.daysLeft", { count: info.days, date })}
    </Alert>
  );
}
