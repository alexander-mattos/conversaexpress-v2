"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button, Paper, Stack, TextField } from "@mui/material";
import { MainContainer, MainHeader, Title } from "@/components/page/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { daysUntil } from "@/lib/invoices/invoices";

// Porta de frontend/src/pages/Subscription. "Assinar agora" leva às faturas,
// onde cada uma é paga pelo Asaas (Pix, boleto ou cartão).
export default function SubscriptionPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [company, setCompany] = useState<{ email?: string | null; dueDate?: string | null } | null>(null);
  // Vencimento e e-mail vêm da empresa (o usuário renovado pelo cookie não
  // traz a empresa).
  const days = daysUntil(company?.dueDate ?? user?.company?.dueDate);

  const companyId = user?.companyId;
  useEffect(() => {
    if (!companyId) return;
    api
      .get<{ email?: string | null; dueDate?: string | null }>(`/companies/${companyId}`)
      .then(({ data }) => setCompany(data))
      .catch(toastError);
  }, [companyId]);

  return (
    <MainContainer>
      <MainHeader>
        <Title>{t("subscription.title")}</Title>
      </MainHeader>
      <Paper variant="outlined" sx={{ p: 2, maxWidth: { sm: "33%" }, minWidth: { sm: 360 } }}>
        <Stack spacing={2}>
          <TextField
            label={t("subscription.testPeriod")}
            value={days === null ? "-" : `${t("subscription.remainingTest")} ${Math.max(days, 0)} ${t("subscription.remainingTest2")}`}
            fullWidth
            slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true }, htmlInput: { "data-testid": "subscription-days" } }}
          />
          <TextField
            label={t("subscription.chargeEmail")}
            value={company?.email ?? ""}
            fullWidth
            slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
          />
          <Button variant="contained" fullWidth onClick={() => router.push("/financeiro")}>
            {t("subscription.signNow")}
          </Button>
        </Stack>
      </Paper>
    </MainContainer>
  );
}
