"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Box, Grid, LinearProgress, Paper, Skeleton, Typography } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ScheduleIcon from "@mui/icons-material/Schedule";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { MainContainer, MainHeader, Title, mainPaperSx } from "@/components/page/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaignsGuard } from "@/hooks/usePlanGuard";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { STATUS_KEYS, formatDateTime, reportCounts, type Campaign } from "@/lib/campaigns/campaigns";

function Counter({ icon, title, value, loading }: { icon: ReactNode; title: string; value: ReactNode; loading: boolean }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }} data-testid="campaign-counter">
      <Box sx={{ fontSize: 40, color: "primary.main", display: "flex" }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {loading ? <Skeleton width={80} /> : <Typography variant="h6" noWrap>{value || "-"}</Typography>}
      </Box>
    </Paper>
  );
}

// Porta de frontend/src/pages/CampaignReport. A cada evento da campanha a tela
// busca de novo (o evento nem sempre traz os envios).
export default function CampaignReportPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const allowed = useCampaignsGuard();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey(key => key + 1), []);

  useEffect(() => {
    if (!allowed) return undefined;
    let active = true;
    api
      .get<Campaign>(`/campaigns/${id}`)
      .then(({ data }) => active && setCampaign(data))
      .catch(err => active && toastError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [allowed, id, reloadKey]);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!allowed || !companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-campaign`, (data: { record?: Campaign }) => {
      if (data.record?.id !== Number(id)) return;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(load, 1000);
    });
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      socket.disconnect();
    };
  }, [allowed, companyId, userId, id, load]);

  const { valid, delivered, percent } = useMemo(() => reportCounts(campaign), [campaign]);

  if (!allowed) return null;

  const status = campaign ? (STATUS_KEYS[campaign.status] ? t(STATUS_KEYS[campaign.status]) : campaign.status) : "";

  return (
    <MainContainer>
      <MainHeader>
        <Title>
          {t("campaigns.report.title")} {campaign?.name || t("campaigns.report.title2")}
        </Title>
      </MainHeader>
      <Paper variant="outlined" sx={{ ...mainPaperSx, p: 2 }}>
        <Typography variant="h6" component="h2" data-testid="campaign-report-status">
          Status: {status} {delivered} {t("campaigns.report.of")} {valid}
        </Typography>
        <LinearProgress variant="determinate" value={percent} sx={{ height: 15, borderRadius: 1, my: 2.5 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Counter icon={<GroupIcon fontSize="inherit" />} title={t("campaigns.report.validContacts")} value={valid} loading={loading} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Counter icon={<CheckCircleIcon fontSize="inherit" />} title={t("campaigns.report.delivered")} value={delivered} loading={loading} />
          </Grid>
          {campaign?.whatsapp && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Counter icon={<WhatsAppIcon fontSize="inherit" />} title={t("campaigns.report.connection")} value={campaign.whatsapp.name} loading={loading} />
            </Grid>
          )}
          {campaign?.contactList && (
            <Grid size={{ xs: 12, md: 4 }}>
              <Counter icon={<ListAltIcon fontSize="inherit" />} title={t("campaigns.report.contactList")} value={campaign.contactList.name} loading={loading} />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 4 }}>
            <Counter icon={<ScheduleIcon fontSize="inherit" />} title={t("campaigns.report.schedule")} value={formatDateTime(campaign?.scheduledAt)} loading={loading} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Counter icon={<EventAvailableIcon fontSize="inherit" />} title={t("campaigns.report.conclusion")} value={formatDateTime(campaign?.completedAt)} loading={loading} />
          </Grid>
        </Grid>
      </Paper>
    </MainContainer>
  );
}
