"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Box, CircularProgress, Paper, Tab, Tabs } from "@mui/material";
import { MainContainer, MainHeader, Title, mainPaperSx } from "@/components/page/PageLayout";
import SchedulesForm from "@/components/queues/SchedulesForm";
import OptionsTab from "@/components/settings/OptionsTab";
import CompaniesTab from "@/components/settings/CompaniesTab";
import PlansTab from "@/components/settings/PlansTab";
import HelpsTab from "@/components/settings/HelpsTab";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { can } from "@/lib/rules";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { defaultSchedules, type QueueSchedule } from "@/lib/queues/schedules";
import { settingValue, upsertSetting, type SettingRow } from "@/lib/settings/settings";

type TabKey = "options" | "schedules" | "companies" | "plans" | "helps";

// Porta de frontend/src/pages/SettingsCustom. Só admin (como o menu); as abas
// Empresas, Planos e Ajuda só para o super.
export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = can(user?.profile, "drawer-admin-items:view");
  const isSuper = !!user?.super;
  const [tab, setTab] = useState<TabKey>("options");
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [schedules, setSchedules] = useState<QueueSchedule[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !isAdmin) {
      toast.error(t("backendErrors.ERR_NO_PERMISSION"));
      router.replace("/");
    }
  }, [user, isAdmin, router, t]);

  const companyId = user?.companyId;
  useEffect(() => {
    if (!isAdmin || !companyId) return undefined;
    let active = true;
    Promise.all([api.get<SettingRow[]>("/settings"), api.get<{ schedules?: QueueSchedule[] }>(`/companies/${companyId}`)])
      .then(([settingList, company]) => {
        if (!active) return;
        setSettings(settingList.data ?? []);
        const saved = company.data?.schedules;
        setSchedules(Array.isArray(saved) && saved.length ? saved : defaultSchedules());
      })
      .catch(err => active && toastError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isAdmin, companyId]);

  const userId = user?.id;
  useEffect(() => {
    if (!isAdmin || !companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-settings`, (data: { action: string; setting?: SettingRow }) => {
      if (data.action === "update" && data.setting) setSettings(prev => upsertSetting(prev, data.setting as SettingRow));
    });
    return () => socket.disconnect();
  }, [isAdmin, companyId, userId]);

  const schedulesEnabled = settingValue(settings, "scheduleType") === "company";
  const current: TabKey = (tab === "schedules" && !schedulesEnabled) || (["companies", "plans", "helps"].includes(tab) && !isSuper) ? "options" : tab;

  const saveSchedules = async (rows: QueueSchedule[]) => {
    try {
      await api.put(`/companies/${companyId}/schedules`, { schedules: rows });
      setSchedules(rows);
      toast.success(t("settings.schedulesUpdated"));
    } catch (err) {
      toastError(err);
    }
  };

  if (!isAdmin) return null;

  return (
    <MainContainer>
      <MainHeader>
        <Title>{t("settings.title")}</Title>
      </MainHeader>
      <Paper variant="outlined" sx={{ ...mainPaperSx, p: 0, display: "flex", flexDirection: "column" }}>
        <Tabs value={current} onChange={(_, value: TabKey) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label={t("settings.tabs.options")} value="options" />
          {schedulesEnabled && <Tab label={t("settings.tabs.schedules")} value="schedules" />}
          {isSuper && <Tab label={t("settings.tabs.companies")} value="companies" />}
          {isSuper && <Tab label={t("settings.tabs.plans")} value="plans" />}
          {isSuper && <Tab label={t("settings.tabs.helps")} value="helps" />}
        </Tabs>
        <Box sx={{ p: 2, flex: 1, overflowY: "auto" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {current === "options" && <OptionsTab settings={settings} onChange={setting => setSettings(prev => upsertSetting(prev, setting))} />}
              {current === "schedules" && schedules && <SchedulesForm initialValues={schedules} onSubmit={saveSchedules} />}
              {current === "companies" && <CompaniesTab />}
              {current === "plans" && <PlansTab />}
              {current === "helps" && <HelpsTab />}
            </>
          )}
        </Box>
      </Paper>
    </MainContainer>
  );
}
