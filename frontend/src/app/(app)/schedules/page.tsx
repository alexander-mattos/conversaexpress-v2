"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Calendar, dateFnsLocalizer, type EventProps } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Box, Button, InputAdornment, Paper, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import { MainContainer, MainHeader, MainHeaderButtonsWrapper, Title, mainPaperSx } from "@/components/page/PageLayout";
import ScheduleModal from "@/components/ticket/ScheduleModal";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

interface Schedule {
  id: number;
  sendAt: string;
  body?: string;
  contact?: { id: number; name: string } | null;
}

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: Schedule;
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { pt: ptBR, en: enUS, es }
});

const iconSx = {
  opacity: 0,
  transition: "opacity 0.3s",
  ml: "5px",
  zIndex: 1,
  fontSize: "1.25rem"
} as const;

// Porta de frontend/src/pages/Schedules.
export default function SchedulesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialContactId = Number(searchParams.get("contactId")) || null;
  const [searchParam, setSearchParam] = useState("");
  // O frontend atual mostrava só a primeira página (20 agendamentos).
  const { items, dispatch, reload } = useInfiniteList<Schedule>({
    url: "/schedules/",
    key: "schedules",
    searchParam,
    all: true
  });
  const [modalOpen, setModalOpen] = useState(!!initialContactId);
  const [contactId, setContactId] = useState<number | null>(initialContactId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);

  // O frontend atual escutava "companyX-schedule" e nunca atualizava.
  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on("schedule", (data: { action: string; schedule?: Schedule; scheduleId?: number | string }) => {
      if ((data.action === "create" || data.action === "update") && data.schedule) reload();
      if (data.action === "delete" && data.scheduleId) dispatch({ type: "DELETE", payload: +data.scheduleId });
    });
    return () => socket.disconnect();
  }, [companyId, userId, dispatch, reload]);

  const messages = useMemo(
    () => ({
      date: t("schedules.messages.date"),
      time: t("schedules.messages.time"),
      event: t("schedules.messages.event"),
      allDay: t("schedules.messages.allDay"),
      week: t("schedules.messages.week"),
      work_week: t("schedules.messages.work_week"),
      day: t("schedules.messages.day"),
      month: t("schedules.messages.month"),
      previous: t("schedules.messages.previous"),
      next: t("schedules.messages.next"),
      yesterday: t("schedules.messages.yesterday"),
      tomorrow: t("schedules.messages.tomorrow"),
      today: t("schedules.messages.today"),
      agenda: t("schedules.messages.agenda"),
      noEventsInRange: t("schedules.messages.noEventsInRange"),
      showMore: (total: number) => `+${total} ${t("schedules.messages.showMore")}`
    }),
    [t]
  );

  const events = useMemo<CalendarEvent[]>(
    () =>
      items.map(schedule => ({
        title: schedule.contact?.name ?? "",
        start: new Date(schedule.sendAt),
        end: new Date(schedule.sendAt),
        resource: schedule
      })),
    [items]
  );

  const handleEdit = (schedule: Schedule) => {
    setContactId(null);
    setSelectedId(schedule.id);
    setModalOpen(true);
  };

  const handleDelete = async (schedule: Schedule) => {
    try {
      await api.delete(`/schedules/${schedule.id}`);
      dispatch({ type: "DELETE", payload: schedule.id });
      toast.success(t("schedules.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  const EventContent = ({ event }: EventProps<CalendarEvent>) => (
    <Box
      data-testid="schedule-event"
      sx={{
        position: "relative",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "&:hover .schedule-action": { opacity: 1 }
      }}
    >
      <Box sx={{ fontSize: 14, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{event.title}</Box>
      <DeleteOutlineIcon
        className="schedule-action"
        aria-label="delete schedule"
        sx={iconSx}
        onClick={e => {
          e.stopPropagation();
          setDeleting(event.resource);
        }}
      />
      <EditIcon
        className="schedule-action"
        aria-label="edit schedule"
        sx={iconSx}
        onClick={e => {
          e.stopPropagation();
          handleEdit(event.resource);
        }}
      />
    </Box>
  );

  const culture = (["pt", "en", "es"] as const).find(lang => i18n.language?.startsWith(lang)) ?? "pt";

  return (
    <MainContainer>
      <ConfirmationModal
        title={t("schedules.confirmationModal.deleteTitle")}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("schedules.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ScheduleModal
        open={modalOpen}
        scheduleId={selectedId}
        contactId={contactId}
        reload={reload}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
          setContactId(null);
        }}
      />
      <MainHeader>
        <Title>
          {t("schedules.title")} ({items.length})
        </Title>
        <MainHeaderButtonsWrapper>
          <TextField
            variant="standard"
            placeholder={t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={e => setSearchParam(e.target.value.toLowerCase())}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "gray" }} />
                  </InputAdornment>
                )
              }
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setSelectedId(null);
              setContactId(null);
              setModalOpen(true);
            }}
          >
            {t("schedules.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Calendar<CalendarEvent>
          culture={culture}
          localizer={localizer}
          messages={messages}
          formats={{ agendaDateFormat: "dd/MM EEE", weekdayFormat: "EEEE" }}
          events={events}
          components={{ event: EventContent }}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 500 }}
        />
      </Paper>
    </MainContainer>
  );
}
