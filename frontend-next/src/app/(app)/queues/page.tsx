"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import {
  MainContainer,
  MainHeader,
  MainHeaderButtonsWrapper,
  TableRowSkeleton,
  Title,
  mainPaperSx
} from "@/components/page/PageLayout";
import QueueModal from "@/components/queues/QueueModal";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { listReducer } from "@/lib/listReducer";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

interface Queue {
  id: number;
  name: string;
  color: string;
  orderQueue?: number | null;
  greetingMessage?: string | null;
}

const cellBox = { display: "flex", alignItems: "center", justifyContent: "center" } as const;

// Porta de frontend/src/pages/Queues.
export default function QueuesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [queues, dispatch] = useReducer(listReducer<Queue>, []);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Queue | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Queue[]>("/queue");
      dispatch({ type: "RESET" });
      dispatch({ type: "LOAD", payload: data });
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Carga inicial; as mudanças seguintes chegam pelo socket.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-queue`, (data: { action: string; queue?: Queue; queueId?: number | string }) => {
      if ((data.action === "update" || data.action === "create") && data.queue) dispatch({ type: "UPSERT", payload: data.queue });
      if (data.action === "delete" && data.queueId) dispatch({ type: "DELETE", payload: +data.queueId });
    });
    return () => socket.disconnect();
  }, [companyId, userId]);

  const handleDelete = async (queue: Queue) => {
    try {
      await api.delete(`/queue/${queue.id}`);
      dispatch({ type: "DELETE", payload: queue.id });
      toast.success(t("queues.toasts.success"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={`${t("queues.confirmationModal.deleteTitle")} ${deleting?.name ?? ""}?`}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("queues.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QueueModal
        open={modalOpen}
        queueId={selectedId}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
        }}
      />
      <MainHeader>
        <Title>{t("queues.title")}</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setSelectedId(null);
              setModalOpen(true);
            }}
          >
            {t("queues.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("queues.table.id")}</TableCell>
              <TableCell align="center">{t("queues.table.name")}</TableCell>
              <TableCell align="center">{t("queues.table.color")}</TableCell>
              <TableCell align="center">{t("queues.table.orderQueue")}</TableCell>
              <TableCell align="center">{t("queues.table.greeting")}</TableCell>
              <TableCell align="center">{t("queues.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {queues.map(queue => (
              <TableRow key={queue.id}>
                <TableCell align="center">{queue.id}</TableCell>
                <TableCell align="center">{queue.name}</TableCell>
                <TableCell align="center">
                  <Box sx={cellBox}>
                    <Box component="span" data-testid="queue-color" sx={{ backgroundColor: queue.color, width: 60, height: 20 }} />
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={cellBox}>
                    <Typography noWrap variant="body2" sx={{ width: 300 }}>
                      {queue.orderQueue}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={cellBox}>
                    <Typography noWrap variant="body2" sx={{ width: 300 }}>
                      {queue.greetingMessage}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="edit queue"
                    onClick={() => {
                      setSelectedId(queue.id);
                      setModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" aria-label="delete queue" onClick={() => setDeleting(queue)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={6} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
