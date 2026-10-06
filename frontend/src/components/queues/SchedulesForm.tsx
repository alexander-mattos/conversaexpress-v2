"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Button, TextField } from "@mui/material";
import { isValidTime, maskTime, type QueueSchedule } from "@/lib/queues/schedules";

// Porta de frontend/src/components/SchedulesForm (horários HH:MM por dia).
// Agora os horários são validados antes de aplicar.
export default function SchedulesForm({
  initialValues,
  onSubmit
}: {
  initialValues: QueueSchedule[];
  onSubmit: (schedules: QueueSchedule[]) => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);

  const change = (index: number, field: "startTime" | "endTime", value: string) =>
    setRows(current => current.map((row, i) => (i === index ? { ...row, [field]: maskTime(value) } : row)));

  const invalid = rows.some(row => !isValidTime(row.startTime) || !isValidTime(row.endTime));

  const timeField = (row: QueueSchedule, index: number, field: "startTime" | "endTime", label: string) => {
    const error = submitted && !isValidTime(row[field]);
    return (
      <TextField
        label={label}
        value={row[field]}
        onChange={e => change(index, field, e.target.value)}
        variant="outlined"
        margin="dense"
        placeholder="00:00"
        error={error}
        helperText={error ? t("queueModal.invalidTime") : undefined}
        slotProps={{ htmlInput: { inputMode: "numeric", "aria-label": `${row.weekdayEn} ${field}` } }}
        sx={{ mr: "3.2%", width: "30%" }}
      />
    );
  };

  return (
    <Box
      component="form"
      noValidate
      sx={{ width: "100%" }}
      onSubmit={e => {
        e.preventDefault();
        setSubmitted(true);
        if (!invalid) onSubmit(rows);
      }}
    >
      {rows.map((row, index) => (
        <Box key={row.weekdayEn} sx={{ px: { xs: 2, sm: 3 } }}>
          <TextField
            label={t("settings.schedules.form.weekday")}
            value={t(`queueModal.weekdays.${row.weekdayEn}`)}
            disabled
            variant="outlined"
            margin="dense"
            sx={{ mr: "3.2%", width: "30%" }}
          />
          {timeField(row, index, "startTime", t("settings.schedules.form.initialHour"))}
          {timeField(row, index, "endTime", t("settings.schedules.form.finalHour"))}
        </Box>
      ))}
      <Box sx={{ textAlign: "center", mt: "2%", p: 1 }}>
        <Button type="submit" color="primary" variant="contained">
          {t("queueModal.saveSchedules")}
        </Button>
      </Box>
    </Box>
  );
}
