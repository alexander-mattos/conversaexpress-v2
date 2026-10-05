"use client";

import { useCallback, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@mui/material";
import { green } from "@mui/material/colors";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CropFreeIcon from "@mui/icons-material/CropFree";
import SignalCellular4BarIcon from "@mui/icons-material/SignalCellular4Bar";
import SignalCellularConnectedNoInternet0BarIcon from "@mui/icons-material/SignalCellularConnectedNoInternet0Bar";
import SignalCellularConnectedNoInternet2BarIcon from "@mui/icons-material/SignalCellularConnectedNoInternet2Bar";
import PhonelinkEraseIcon from "@mui/icons-material/PhonelinkErase";
import ConfirmationModal from "@/components/ConfirmationModal";
import QrcodeModal from "@/components/connections/QrcodeModal";
import WhatsAppModal from "@/components/connections/WhatsAppModal";
import {
  MainContainer,
  MainHeader,
  MainHeaderButtonsWrapper,
  TableRowSkeleton,
  Title,
  mainPaperSx
} from "@/components/page/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useWhatsApps, type WhatsApp } from "@/hooks/useWhatsApps";
import { api } from "@/lib/api";
import { can } from "@/lib/rules";
import { toastError } from "@/lib/toastError";

const cellBox = { display: "flex", alignItems: "center", justifyContent: "center" } as const;

function StatusTip({ title, content, children }: { title: string; content?: string; children: ReactElement }) {
  return (
    <Tooltip
      arrow
      slotProps={{
        tooltip: {
          sx: {
            backgroundColor: "#f5f5f9",
            color: "rgba(0, 0, 0, 0.87)",
            fontSize: "0.875rem",
            border: "1px solid #dadde9",
            maxWidth: 450,
            textAlign: "center"
          }
        },
        arrow: { sx: { color: "#f5f5f9" } }
      }}
      title={
        <>
          <Typography gutterBottom color="inherit">
            {title}
          </Typography>
          {content && <Typography>{content}</Typography>}
        </>
      }
    >
      {children}
    </Tooltip>
  );
}

type Confirm = { action: "disconnect" | "delete"; whatsAppId: number } | null;

// Porta de frontend/src/pages/Connections.
export default function ConnectionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { whatsApps, loading } = useWhatsApps(user?.companyId, user?.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const profile = user?.profile;
  const showSession = can(profile, "connections-page:actionButtons");
  const showActions = can(profile, "connections-page:editOrDeleteConnection");

  const session = async (method: "post" | "put", id: number) => {
    try {
      await api[method](`/whatsappsession/${id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === "disconnect") await api.delete(`/whatsappsession/${confirm.whatsAppId}`);
      if (confirm.action === "delete") {
        await api.delete(`/whatsapp/${confirm.whatsAppId}`);
        toast.success(t("connections.toasts.deleted"));
      }
    } catch (err) {
      toastError(err);
    }
    setConfirm(null);
  };

  const closeQr = useCallback(() => {
    setQrOpen(false);
    setSelectedId(null);
  }, []);

  const actionButtons = (whatsApp: WhatsApp) => (
    <>
      {whatsApp.status === "qrcode" && (
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={() => {
            setSelectedId(whatsApp.id);
            setQrOpen(true);
          }}
        >
          {t("connections.buttons.qrcode")}
        </Button>
      )}
      {(whatsApp.status === "DISCONNECTED" || whatsApp.status === "PENDING") && (
        <>
          {whatsApp.status === "DISCONNECTED" && (
            <Button size="small" variant="outlined" color="primary" onClick={() => session("post", whatsApp.id)}>
              {t("connections.buttons.tryAgain")}
            </Button>
          )}{" "}
          <Button size="small" variant="outlined" color="secondary" onClick={() => session("put", whatsApp.id)}>
            {t("connections.buttons.newQr")}
          </Button>
        </>
      )}
      {(whatsApp.status === "CONNECTED" || whatsApp.status === "PAIRING" || whatsApp.status === "TIMEOUT") && (
        <Button size="small" variant="outlined" color="secondary" onClick={() => setConfirm({ action: "disconnect", whatsAppId: whatsApp.id })}>
          {t("connections.buttons.disconnect")}
        </Button>
      )}
      {whatsApp.status === "OPENING" && (
        <Button size="small" variant="outlined" disabled>
          {t("connections.buttons.connecting")}
        </Button>
      )}
    </>
  );

  const statusIcon = (whatsApp: WhatsApp) => (
    <Box sx={cellBox} data-testid={`status-${whatsApp.status}`}>
      {whatsApp.status === "DISCONNECTED" && (
        <StatusTip title={t("connections.toolTips.disconnected.title")} content={t("connections.toolTips.disconnected.content")}>
          <SignalCellularConnectedNoInternet0BarIcon color="secondary" />
        </StatusTip>
      )}
      {whatsApp.status === "OPENING" && <CircularProgress size={24} sx={{ color: green[500] }} />}
      {whatsApp.status === "qrcode" && (
        <StatusTip title={t("connections.toolTips.qrcode.title")} content={t("connections.toolTips.qrcode.content")}>
          <CropFreeIcon />
        </StatusTip>
      )}
      {whatsApp.status === "CONNECTED" && (
        <StatusTip title={t("connections.toolTips.connected.title")}>
          <SignalCellular4BarIcon sx={{ color: green[500] }} />
        </StatusTip>
      )}
      {(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && (
        <StatusTip title={t("connections.toolTips.timeout.title")} content={t("connections.toolTips.timeout.content")}>
          <SignalCellularConnectedNoInternet2BarIcon color="secondary" />
        </StatusTip>
      )}
      {/* Antes "PENDING" (sessão encerrada no celular) ficava sem ícone nem botão. */}
      {whatsApp.status === "PENDING" && (
        <StatusTip title={t("connections.toolTips.pending.title")} content={t("connections.toolTips.pending.content")}>
          <PhonelinkEraseIcon color="secondary" />
        </StatusTip>
      )}
    </Box>
  );

  const lastUpdate = (value?: string) => {
    if (!value) return "";
    try {
      return format(parseISO(value), "dd/MM/yy HH:mm");
    } catch {
      return "";
    }
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={confirm?.action === "disconnect" ? t("connections.confirmationModal.disconnectTitle") : t("connections.confirmationModal.deleteTitle")}
        open={!!confirm}
        onClose={open => !open && setConfirm(null)}
        onConfirm={handleConfirm}
      >
        {confirm?.action === "disconnect" ? t("connections.confirmationModal.disconnectMessage") : t("connections.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <QrcodeModal open={qrOpen} onClose={closeQr} whatsAppId={qrOpen ? selectedId : null} />
      <WhatsAppModal
        open={modalOpen}
        whatsAppId={modalOpen ? selectedId : null}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
        }}
      />
      <MainHeader>
        <Title>{t("connections.title")}</Title>
        <MainHeaderButtonsWrapper>
          {can(profile, "connections-page:addConnection") && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setSelectedId(null);
                setModalOpen(true);
              }}
            >
              {t("connections.buttons.add")}
            </Button>
          )}
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("connections.table.name")}</TableCell>
              <TableCell align="center">{t("connections.table.status")}</TableCell>
              {showSession && <TableCell align="center">{t("connections.table.session")}</TableCell>}
              <TableCell align="center">{t("connections.table.lastUpdate")}</TableCell>
              <TableCell align="center">{t("connections.table.default")}</TableCell>
              {showActions && <TableCell align="center">{t("connections.table.actions")}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowSkeleton columns={showActions ? 6 : 4} />
            ) : (
              whatsApps.map(whatsApp => (
                <TableRow key={whatsApp.id}>
                  <TableCell align="center">{whatsApp.name}</TableCell>
                  <TableCell align="center">{statusIcon(whatsApp)}</TableCell>
                  {showSession && <TableCell align="center">{actionButtons(whatsApp)}</TableCell>}
                  <TableCell align="center">{lastUpdate(whatsApp.updatedAt)}</TableCell>
                  <TableCell align="center">
                    {whatsApp.isDefault && (
                      <Box sx={cellBox}>
                        <CheckCircleIcon sx={{ color: green[500] }} />
                      </Box>
                    )}
                  </TableCell>
                  {showActions && (
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        aria-label="edit connection"
                        onClick={() => {
                          setSelectedId(whatsApp.id);
                          setModalOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" aria-label="delete connection" onClick={() => setConfirm({ action: "delete", whatsAppId: whatsApp.id })}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
