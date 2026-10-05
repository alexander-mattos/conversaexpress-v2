"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Avatar,
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
import ConfirmationModal from "@/components/ConfirmationModal";
import QueueIntegrationModal from "@/components/integrations/QueueIntegrationModal";
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
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import dialogflow from "@/assets/dialogflow.png";
import n8n from "@/assets/n8n.png";
import typebot from "@/assets/typebot.jpg";
import webhook from "@/assets/webhook.png";

interface Integration {
  id: number;
  name: string;
  type: string;
}

const LOGOS: Record<string, string> = { dialogflow: dialogflow.src, n8n: n8n.src, webhook: webhook.src, typebot: typebot.src };

// Porta de frontend/src/pages/QueueIntegration.
export default function QueueIntegrationPage() {
  const allowed = usePlanGuard("useIntegrations");
  return allowed ? <QueueIntegrations /> : null;
}

function QueueIntegrations() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParam, setSearchParam] = useState("");
  const { items, dispatch, loading, handleScroll } = useInfiniteList<Integration>({
    url: "/queueIntegration/",
    key: "queueIntegrations",
    searchParam
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Integration | null>(null);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-queueIntegration`, (data: { action: string; queueIntegration?: Integration; integrationId?: number }) => {
      if ((data.action === "create" || data.action === "update") && data.queueIntegration) {
        dispatch({ type: "UPSERT", payload: data.queueIntegration });
      }
      if (data.action === "delete" && data.integrationId) dispatch({ type: "DELETE", payload: +data.integrationId });
    });
    return () => socket.disconnect();
  }, [companyId, userId, dispatch]);

  const handleDelete = async (integration: Integration) => {
    try {
      await api.delete(`/queueIntegration/${integration.id}`);
      // A tela atual dependia só do socket para tirar a linha.
      dispatch({ type: "DELETE", payload: integration.id });
      toast.success(t("queueIntegration.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={`${t("queueIntegration.confirmationModal.deleteTitle")} ${deleting?.name ?? ""}?`}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("queueIntegration.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QueueIntegrationModal
        open={modalOpen}
        integrationId={selectedId}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
        }}
      />
      <MainHeader>
        <Title>
          {t("queueIntegration.title")} ({items.length})
        </Title>
        <MainHeaderButtonsWrapper>
          <TextField
            variant="standard"
            placeholder={t("queueIntegration.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={e => setSearchParam(e.target.value.toLowerCase())}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="secondary" />
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
            {t("queueIntegration.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" onScroll={handleScroll} sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell align="center">{t("queueIntegration.table.id")}</TableCell>
              <TableCell align="center">{t("queueIntegration.table.name")}</TableCell>
              <TableCell align="center" />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(integration => (
              <TableRow key={integration.id}>
                <TableCell>
                  <Avatar
                    src={LOGOS[integration.type]}
                    alt={integration.type}
                    variant="rounded"
                    sx={{ width: 140, height: 40, borderRadius: "4px" }}
                  >
                    {integration.type}
                  </Avatar>
                </TableCell>
                <TableCell align="center">{integration.id}</TableCell>
                <TableCell align="center">{integration.name}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="edit integration"
                    onClick={() => {
                      setSelectedId(integration.id);
                      setModalOpen(true);
                    }}
                  >
                    <EditIcon color="secondary" />
                  </IconButton>
                  <IconButton size="small" aria-label="delete integration" onClick={() => setDeleting(integration)}>
                    <DeleteOutlineIcon color="secondary" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={4} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
