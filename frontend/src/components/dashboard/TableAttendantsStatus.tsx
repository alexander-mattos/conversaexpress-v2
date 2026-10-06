"use client";

import {
  Paper,
  Rating,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import { green, red } from "@mui/material/colors";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import StarIcon from "@mui/icons-material/Star";
import { useTranslation } from "react-i18next";
import { formatTime } from "@/lib/formatTime";

export interface Attendant {
  id?: number;
  name: string;
  rating: number | null;
  avgSupportTime: number;
  online: boolean;
}

export default function TableAttendantsStatus({ attendants, loading }: { attendants: Attendant[]; loading: boolean }) {
  const { t } = useTranslation();

  if (loading) return <Skeleton variant="rectangular" height={150} />;

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("dashboard.onlineTable.name")}</TableCell>
            <TableCell align="center">{t("dashboard.onlineTable.ratings")}</TableCell>
            <TableCell align="center">{t("dashboard.onlineTable.avgSupportTime")}</TableCell>
            <TableCell align="center">{t("dashboard.onlineTable.status")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {attendants.map((a, index) => (
            <TableRow key={a.id ?? index}>
              <TableCell>{a.name}</TableCell>
              <TableCell align="center" title={t("dashboard.onlineTable.ratingLabel")} sx={{ cursor: "pointer" }}>
                {/* Estrela vazia cheia e cinza, como no Rating do Material-UI v4. */}
                <Rating
                  value={a.rating === null ? 0 : Math.trunc(a.rating)}
                  max={3}
                  readOnly
                  emptyIcon={<StarIcon fontSize="inherit" />}
                />
              </TableCell>
              <TableCell align="center">{formatTime(a.avgSupportTime)}</TableCell>
              <TableCell align="center">
                {a.online ? (
                  <CheckCircleIcon sx={{ color: green[600], fontSize: "20px" }} />
                ) : (
                  <ErrorIcon sx={{ color: red[600], fontSize: "20px" }} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
