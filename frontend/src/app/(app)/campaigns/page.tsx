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
  TextField,
  Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionIcon from "@mui/icons-material/Description";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutlined";
import CampaignModal from "@/components/campaigns/CampaignModal";
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
import { useCampaignsGuard } from "@/hooks/usePlanGuard";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { STATUS_KEYS, canCancel, canDelete, canRestart, formatDateTime, type Campaign } from "@/lib/campaigns/campaigns";

// Porta de frontend/src/pages/Campaigns. Alterar e disparar só para admin (como
// a API); o atendente vê a lista e o relatório.
export default function CampaignsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const allowed = useCampaignsGuard();
  const isAdmin = user?.profile === "admin";
  const [searchParam, setSearchParam] = useState("");
  const { items, dispatch, loading, handleScroll, reload } = useInfiniteList<Campaign>({
    url: "/campaigns/",
    key: "records",
    searchParam,
    enabled: allowed
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!allowed || !companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-campaign`, (data: { action: string; record?: Campaign; id?: number | string }) => {
      if ((data.action === "create" || data.action === "update") && data.record) {
        dispatch({ type: "PATCH", payload: data.record });
        if (data.action === "create") reload();
      }
      if (data.action === "delete" && data.id) dispatch({ type: "DELETE", payload: +data.id });
    });
    return () => socket.disconnect();
  }, [allowed, companyId, userId, dispatch, reload]);

  const openModal = (id: number | null) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  const handleDelete = async (campaign: Campaign) => {
    try {
      await api.delete(`/campaigns/${campaign.id}`);
      dispatch({ type: "DELETE", payload: campaign.id });
      toast.success(t("campaigns.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  const changeStatus = async (campaign: Campaign, action: "cancel" | "restart") => {
    try {
      await api.post(`/campaigns/${campaign.id}/${action}`);
      dispatch({ type: "PATCH", payload: { id: campaign.id, status: action === "cancel" ? "CANCELADA" : "EM_ANDAMENTO" } });
      toast.success(t(`campaigns.toasts.${action}`));
    } catch (err) {
      toastError(err);
    }
  };

  if (!allowed) return null;

  return (
    <MainContainer>
      <ConfirmationModal
        title={deleting ? `${t("campaigns.confirmationModal.deleteTitle")} ${deleting.name}?` : ""}
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <CampaignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        campaignId={selectedId}
        readOnly={!isAdmin}
        reload={reload}
      />
      <MainHeader>
        <Title>{t("campaigns.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={t("campaigns.searchPlaceholder")}
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
          <Button variant="outlined" color="primary" onClick={() => router.push("/contact-lists")}>
            {t("campaigns.buttons.contactLists")}
          </Button>
          {isAdmin && (
            <Button variant="contained" color="primary" onClick={() => openModal(null)}>
              {t("campaigns.buttons.add")}
            </Button>
          )}
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" sx={mainPaperSx} onScroll={handleScroll}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("campaigns.table.name")}</TableCell>
              <TableCell align="center">{t("campaigns.table.status")}</TableCell>
              <TableCell align="center">{t("campaigns.table.contactList")}</TableCell>
              <TableCell align="center">{t("campaigns.table.whatsapp")}</TableCell>
              <TableCell align="center">{t("campaigns.table.scheduledAt")}</TableCell>
              <TableCell align="center">{t("campaigns.table.completedAt")}</TableCell>
              <TableCell align="center">{t("campaigns.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(campaign => (
              <TableRow key={campaign.id} data-testid="campaign-row">
                <TableCell align="center">{campaign.name}</TableCell>
                <TableCell align="center" data-testid="campaign-status">
                  {STATUS_KEYS[campaign.status] ? t(STATUS_KEYS[campaign.status]) : campaign.status}
                </TableCell>
                <TableCell align="center">{campaign.contactList?.name ?? t("campaigns.table.notDefined")}</TableCell>
                <TableCell align="center">{campaign.whatsapp?.name ?? t("campaigns.table.notDefined2")}</TableCell>
                <TableCell align="center">
                  {campaign.scheduledAt ? formatDateTime(campaign.scheduledAt) : t("campaigns.table.notScheduled")}
                </TableCell>
                <TableCell align="center">
                  {campaign.completedAt ? formatDateTime(campaign.completedAt) : t("campaigns.table.notConcluded")}
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  {isAdmin && canCancel(campaign.status) && (
                    <Tooltip title={t("campaigns.table.stopCampaign")}>
                      <IconButton size="small" aria-label="cancel campaign" onClick={() => changeStatus(campaign, "cancel")}>
                        <PauseCircleOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAdmin && canRestart(campaign.status) && (
                    <Tooltip title={t("campaigns.dialog.buttons.restart")}>
                      <IconButton size="small" aria-label="restart campaign" onClick={() => changeStatus(campaign, "restart")}>
                        <PlayCircleOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <IconButton size="small" aria-label="campaign report" onClick={() => router.push(`/campaign/${campaign.id}/report`)}>
                    <DescriptionIcon />
                  </IconButton>
                  <IconButton size="small" aria-label={isAdmin ? "edit campaign" : "view campaign"} onClick={() => openModal(campaign.id)}>
                    {isAdmin ? <EditIcon /> : <VisibilityIcon />}
                  </IconButton>
                  {isAdmin && canDelete(campaign.status) && (
                    <IconButton size="small" aria-label="delete campaign" onClick={() => setDeleting(campaign)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={7} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
