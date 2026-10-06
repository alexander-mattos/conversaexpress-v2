"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AnnouncementModal from "@/components/announcements/AnnouncementModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import {
  MainContainer,
  MainHeader,
  MainHeaderButtonsWrapper,
  TableRowSkeleton,
  Title,
  mainPaperSx
} from "@/components/page/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { api } from "@/lib/api";
import { PRIORITY_KEYS, type Announcement } from "@/lib/announcements/announcements";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

// Porta de frontend/src/pages/Annoucements: só para o super, como o menu e a API.
export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const allowed = !!user?.super;

  useEffect(() => {
    if (user && !user.super) {
      toast.error(t("announcements.toasts.info"));
      router.replace("/");
    }
  }, [user, router, t]);

  return allowed ? <Announcements /> : null;
}

function Announcements() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParam, setSearchParam] = useState("");
  // all=1: o super vê também os inativos (antes sumiam da tela para sempre).
  const { items, dispatch, loading, handleScroll, reload } = useInfiniteList<Announcement>({
    url: "/announcements/",
    key: "records",
    searchParam,
    params: { all: 1 }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    const onEvent = () => reload();
    socket.on("company-announcement", onEvent);
    return () => socket.off("company-announcement", onEvent);
  }, [companyId, userId, reload]);

  const handleDelete = async (record: Announcement) => {
    try {
      await api.delete(`/announcements/${record.id}`);
      dispatch({ type: "DELETE", payload: record.id });
      toast.success(t("announcements.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={`${t("announcements.confirmationModal.deleteTitle")} ${deleting?.title ?? ""}?`}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("announcements.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <AnnouncementModal
        open={modalOpen}
        announcementId={selectedId}
        reload={reload}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
        }}
      />
      <MainHeader>
        <Title>
          {t("announcements.title")} ({items.length})
        </Title>
        <MainHeaderButtonsWrapper>
          <TextField
            variant="standard"
            placeholder={t("announcements.searchPlaceholder")}
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
              setModalOpen(true);
            }}
          >
            {t("announcements.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" onScroll={handleScroll} sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("announcements.table.title")}</TableCell>
              <TableCell align="center">{t("announcements.table.priority")}</TableCell>
              <TableCell align="center">{t("announcements.table.mediaName")}</TableCell>
              <TableCell align="center">{t("announcements.table.status")}</TableCell>
              <TableCell align="center">{t("announcements.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(record => (
              <TableRow key={record.id}>
                <TableCell align="center">{record.title}</TableCell>
                <TableCell align="center">{t(PRIORITY_KEYS[record.priority] ?? "announcements.low")}</TableCell>
                <TableCell align="center">{record.mediaName ?? t("quickMessages.noAttachment")}</TableCell>
                <TableCell align="center">{record.status ? t("announcements.active") : t("announcements.inactive")}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="edit announcement"
                    onClick={() => {
                      setSelectedId(record.id);
                      setModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" aria-label="delete announcement" onClick={() => setDeleting(record)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={5} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
