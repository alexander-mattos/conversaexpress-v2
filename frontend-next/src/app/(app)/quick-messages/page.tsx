"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Button,
  Grid,
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
import ConfirmationModal from "@/components/ConfirmationModal";
import { MainContainer, MainHeader, TableRowSkeleton, Title, mainPaperSx } from "@/components/page/PageLayout";
import QuickMessageDialog from "@/components/quickMessages/QuickMessageDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

interface QuickMessage {
  id: number;
  shortcode: string;
  message: string;
  mediaName?: string | null;
  userId?: number;
}

// Porta de frontend/src/pages/QuickMessages.
export default function QuickMessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParam, setSearchParam] = useState("");
  const { items, dispatch, loading, handleScroll, reload } = useInfiniteList<QuickMessage>({
    url: "/quick-messages",
    key: "records",
    searchParam
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<QuickMessage | null>(null);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    // O frontend atual escutava "companyX-quickemessage" e nunca atualizava.
    socket.on(`company-${companyId}-quickmessage`, (data: { action: string; record?: QuickMessage; id?: number | string }) => {
      if ((data.action === "create" || data.action === "update") && data.record && data.record.userId === userId) {
        dispatch({ type: "UPSERT", payload: data.record });
      }
      if (data.action === "delete" && data.id) dispatch({ type: "DELETE", payload: +data.id });
    });
    return () => socket.disconnect();
  }, [companyId, userId, dispatch]);

  const handleDelete = async (record: QuickMessage) => {
    try {
      await api.delete(`/quick-messages/${record.id}`);
      dispatch({ type: "DELETE", payload: record.id });
      toast.success(t("quickMessages.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={`${t("quickMessages.confirmationModal.deleteTitle")} ${deleting?.shortcode ?? ""}?`}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("quickMessages.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QuickMessageDialog
        open={dialogOpen}
        quickMessageId={selectedId}
        reload={reload}
        onClose={() => {
          setDialogOpen(false);
          setSelectedId(null);
        }}
      />
      <MainHeader>
        <Grid container sx={{ width: "99.6%" }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Title>{t("quickMessages.title")}</Title>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder={t("quickMessages.searchPlaceholder")}
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
              </Grid>
              <Grid size={6}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    setSelectedId(null);
                    setDialogOpen(true);
                  }}
                >
                  {t("quickMessages.buttons.add")}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MainHeader>
      <Paper variant="outlined" onScroll={handleScroll} sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("quickMessages.table.shortcode")}</TableCell>
              <TableCell align="center">{t("quickMessages.table.mediaName")}</TableCell>
              <TableCell align="center">{t("quickMessages.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(record => (
              <TableRow key={record.id}>
                <TableCell align="center">{record.shortcode}</TableCell>
                <TableCell align="center">{record.mediaName ?? t("quickMessages.noAttachment")}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="edit quick message"
                    onClick={() => {
                      setSelectedId(record.id);
                      setDialogOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" aria-label="delete quick message" onClick={() => setDeleting(record)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={3} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
