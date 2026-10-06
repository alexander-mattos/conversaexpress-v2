"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { format, startOfMonth } from "date-fns";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import AccessAlarmIcon from "@mui/icons-material/AccessAlarm";
import TimerIcon from "@mui/icons-material/Timer";
import TableAttendantsStatus, { type Attendant } from "@/components/dashboard/TableAttendantsStatus";
import TicketsChart from "@/components/dashboard/TicketsChart";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/formatTime";
import { toastError } from "@/lib/toastError";

interface Counters {
  supportHappening?: number;
  supportPending?: number;
  supportFinished?: number;
  avgSupportTime?: number;
  avgWaitTime?: number;
}

const fetchDashboard = (params: Record<string, string | number>) =>
  api
    .get<{ counters: Counters; attendants: Attendant[] }>("/dashboard", { params })
    .then(({ data }) => ({
      counters: data.counters ?? {},
      attendants: Array.isArray(data.attendants) ? data.attendants : []
    }));

const PERIODS = [0, 3, 7, 15, 30, 60, 90] as const;
const PERIOD_KEYS: Record<number, string> = {
  0: "none",
  3: "last3",
  7: "last7",
  15: "last15",
  30: "last30",
  60: "last60",
  90: "last90"
};

function CounterCard({ title, value, Icon }: { title: string; value: React.ReactNode; Icon: ElementType }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Paper
        elevation={6}
        sx={theme => ({
          p: 2,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          // No escuro o cartão atual cai no fundo padrão do Paper.
          backgroundColor: theme.palette.mode === "dark" ? undefined : theme.palette.primary.main,
          color: "#eee"
        })}
      >
        <Grid container spacing={3}>
          <Grid size={8}>
            <Typography component="h3" variant="h6" sx={{ mb: 2 }}>
              {title}
            </Typography>
            <Typography component="h1" variant="h4">
              {value}
            </Typography>
          </Grid>
          <Grid size={4}>
            <Icon sx={{ fontSize: 100, color: "#FFFFFF" }} />
          </Grid>
        </Grid>
      </Paper>
    </Grid>
  );
}

// Porta de frontend/src/pages/Dashboard/index.js.
export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [counters, setCounters] = useState<Counters>({});
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [contactsCount, setContactsCount] = useState(0);
  const [period, setPeriod] = useState<number>(0);
  const [filterType, setFilterType] = useState<1 | 2>(1);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);

  const applyResult = (result: Awaited<ReturnType<typeof fetchDashboard>>) => {
    setCounters(result.counters);
    setAttendants(result.attendants);
  };

  const fetchData = async () => {
    const params: Record<string, string | number> = {};
    if (period > 0) params.days = period;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    if (Object.keys(params).length === 0) {
      toast.error(t("dashboard.toasts.selectFilterError"));
      return;
    }

    setLoading(true);
    try {
      applyResult(await fetchDashboard(params));
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  // Primeira carga com o filtro padrão (do dia 1º do mês até hoje).
  const initialParams = useRef({ date_from: dateFrom, date_to: dateTo });
  useEffect(() => {
    fetchDashboard(initialParams.current)
      .then(result => {
        setCounters(result.counters);
        setAttendants(result.attendants);
      })
      .catch(toastError)
      .finally(() => setLoading(false));
    api
      .get<{ count: number }>("/contacts", { params: { searchParam: "", pageNumber: 1 } })
      .then(({ data }) => setContactsCount(data.count))
      .catch(toastError);
  }, []);

  const handleChangeFilterType = (value: 1 | 2) => {
    setFilterType(value);
    if (value === 1) {
      setPeriod(0);
    } else {
      setDateFrom("");
      setDateTo("");
    }
  };

  if (!user) return null;

  return (
    <Box>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3} sx={{ justifyContent: "flex-end" }}>
          <CounterCard title={t("dashboard.counters.inTalk")} value={counters.supportHappening} Icon={CallIcon} />
          <CounterCard title={t("dashboard.counters.waiting")} value={counters.supportPending} Icon={HourglassEmptyIcon} />
          <CounterCard title={t("dashboard.counters.finished")} value={counters.supportFinished} Icon={CheckCircleIcon} />
          <CounterCard title={t("dashboard.counters.newContacts")} value={contactsCount} Icon={GroupAddIcon} />
          <CounterCard
            title={t("dashboard.counters.averageTalkTime")}
            value={formatTime(counters.avgSupportTime)}
            Icon={AccessAlarmIcon}
          />
          <CounterCard
            title={t("dashboard.counters.averageWaitTime")}
            value={formatTime(counters.avgWaitTime)}
            Icon={TimerIcon}
          />

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl variant="standard" fullWidth>
              <InputLabel id="filter-type-label">{t("dashboard.filters.filterType.title")}</InputLabel>
              <Select
                labelId="filter-type-label"
                value={filterType}
                onChange={e => handleChangeFilterType(Number(e.target.value) as 1 | 2)}
              >
                <MenuItem value={1}>{t("dashboard.filters.filterType.options.perDate")}</MenuItem>
                <MenuItem value={2}>{t("dashboard.filters.filterType.options.perPeriod")}</MenuItem>
              </Select>
              <FormHelperText>{t("dashboard.filters.filterType.helper")}</FormHelperText>
            </FormControl>
          </Grid>

          {filterType === 1 ? (
            <>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  variant="standard"
                  fullWidth
                  label={t("dashboard.filters.initialDate")}
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  variant="standard"
                  fullWidth
                  label={t("dashboard.filters.finalDate")}
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </>
          ) : (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl variant="standard" fullWidth>
                <InputLabel id="period-selector-label">{t("dashboard.periodSelect.title")}</InputLabel>
                <Select
                  labelId="period-selector-label"
                  id="period-selector"
                  value={period}
                  onChange={e => setPeriod(Number(e.target.value))}
                >
                  {PERIODS.map(days => (
                    <MenuItem key={days} value={days}>
                      {t(`dashboard.periodSelect.options.${PERIOD_KEYS[days]}`)}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{t("dashboard.periodSelect.helper")}</FormHelperText>
              </FormControl>
            </Grid>
          )}

          <Grid size={12} sx={{ textAlign: "right" }}>
            <Button variant="contained" color="primary" disabled={loading} onClick={fetchData} sx={{ position: "relative" }}>
              {t("dashboard.buttons.filter")}
              {loading && (
                <CircularProgress size={24} sx={{ position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
              )}
            </Button>
          </Grid>

          <Grid size={12}>
            {attendants.length ? <TableAttendantsStatus attendants={attendants} loading={loading} /> : null}
          </Grid>

          <Grid size={12}>
            <Paper sx={{ p: 2, display: "flex", overflow: "auto", flexDirection: "column" }}>
              <TicketsChart variant="user" companyId={user.companyId} />
            </Paper>
          </Grid>

          <Grid size={12}>
            <Paper sx={{ p: 2, display: "flex", overflow: "auto", flexDirection: "column" }}>
              <TicketsChart variant="date" companyId={user.companyId} />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
