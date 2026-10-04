"use client";

import { useCallback, useEffect, useState } from "react";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip, type ChartOptions } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Bar } from "react-chartjs-2";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { BRAND } from "@/theme/tokens";

// O frontend atual registra o datalabels globalmente; os dois gráficos o usam.
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

interface UserPoint {
  nome: string;
  quantidade: number;
}
interface DatePoint {
  data?: string;
  horario?: string;
  total: number;
}

type Variant = "user" | "date";

const ENDPOINT: Record<Variant, string> = {
  user: "/dashboard/ticketsUsers",
  date: "/dashboard/ticketsDay"
};

const toInputDate = (date: Date) => format(date, "yyyy-MM-dd");

// Gráficos "Total de Conversas por Usuários" e "Total" do dashboard atual.
export default function TicketsChart({ variant, companyId }: { variant: Variant; companyId: number }) {
  const { t } = useTranslation();
  const [initialDate, setInitialDate] = useState(toInputDate(new Date()));
  const [finalDate, setFinalDate] = useState(toInputDate(new Date()));
  const [result, setResult] = useState<{ data: (UserPoint | DatePoint)[]; count?: number }>({ data: [] });

  const request = useCallback(
    (from: string, to: string) =>
      api
        .get(ENDPOINT[variant], { params: { initialDate: from, finalDate: to, companyId } })
        .then(({ data }) => data)
        .catch(() => {
          toast.error(t(variant === "user" ? "dashboard.toasts.userChartError" : "dashboard.toasts.dateChartError"));
          return null;
        }),
    [variant, companyId, t]
  );

  const load = (from: string, to: string) =>
    request(from, to).then(data => {
      if (data) setResult(data);
    });

  // Primeira carga: o dia de hoje.
  useEffect(() => {
    let active = true;
    const today = toInputDate(new Date());
    request(today, today).then(data => {
      if (active && data) setResult(data);
    });
    return () => {
      active = false;
    };
  }, [request]);

  const labels = result.data.map(item =>
    variant === "user"
      ? (item as UserPoint).nome
      : "horario" in item && item.horario !== undefined
        ? `Das ${item.horario}:00 as ${item.horario}:59`
        : (item as DatePoint).data
  );
  const values = result.data.map(item =>
    variant === "user" ? (item as UserPoint).quantidade : (item as DatePoint).total
  );

  const options: ChartOptions<"bar"> = {
    responsive: true,
    plugins: {
      legend: { position: "top", display: false },
      title: { display: true, text: t(`dashboard.charts.${variant}.label`), position: "left" },
      datalabels: {
        display: true,
        anchor: "start",
        offset: -30,
        align: "start",
        color: "#fff",
        textStrokeColor: "#000",
        textStrokeWidth: 2,
        font: { size: 20, weight: "bold" }
      }
    }
  };

  return (
    <>
      <Typography component="h2" variant="h6" color="primary" gutterBottom>
        {t(`dashboard.charts.${variant}.title`)}
        {variant === "date" ? ` (${result.count ?? 0})` : null}
      </Typography>

      <Stack direction="row" spacing={2} sx={{ my: 2, alignItems: "center" }}>
        <TextField
          type="date"
          label={t(`dashboard.charts.${variant}.start`)}
          value={initialDate}
          onChange={e => setInitialDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: "20ch" }}
        />
        <TextField
          type="date"
          label={t(`dashboard.charts.${variant}.end`)}
          value={finalDate}
          onChange={e => setFinalDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: "20ch" }}
        />
        {/* Mesmo cinza do button.css atual (rgb(71,71,71), hover rgb(36,36,36)). */}
        <Button
          variant="contained"
          onClick={() => load(initialDate, finalDate)}
          sx={{ background: "rgb(71, 71, 71)", color: "#fff", "&:hover": { background: "rgb(36, 36, 36)" } }}
        >
          {t(`dashboard.charts.${variant}.filter`)}
        </Button>
      </Stack>
      <Bar
        options={options}
        data={{ labels, datasets: [{ data: values, backgroundColor: BRAND.chart }] }}
        style={{ maxWidth: "100%", maxHeight: "280px" }}
      />
    </>
  );
}
