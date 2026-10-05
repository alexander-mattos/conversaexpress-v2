"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { Box, Dialog, DialogContent, Paper, Typography } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsIcon from "@mui/icons-material/Settings";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

const iconSx = { fontSize: "1.1rem", verticalAlign: "middle" } as const;

// Porta de frontend/src/components/QrcodeModal. Só reage à conexão aberta
// (antes fechava quando qualquer outra conexão mudava).
export default function QrcodeModal({ open, onClose, whatsAppId }: { open: boolean; onClose: () => void; whatsAppId?: number | null }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState("");
  const [loadedFor, setLoadedFor] = useState<number | null | undefined>(undefined);
  if (loadedFor !== whatsAppId) {
    setLoadedFor(whatsAppId);
    setQrCode("");
  }

  useEffect(() => {
    if (!open || !whatsAppId) return undefined;
    let active = true;
    api
      .get<{ qrcode?: string }>(`/whatsapp/${whatsAppId}`)
      .then(({ data }) => active && setQrCode(data.qrcode ?? ""))
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open, whatsAppId]);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!open || !whatsAppId || !companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-whatsappSession`, (data: { action: string; session?: { id: number; qrcode?: string; status?: string } }) => {
      if (data.action !== "update" || data.session?.id !== whatsAppId) return;
      setQrCode(data.session.qrcode ?? "");
      if (data.session.qrcode === "" && data.session.status === "CONNECTED") onClose();
    });
    return () => socket.disconnect();
  }, [open, whatsAppId, companyId, userId, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" scroll="paper">
      <DialogContent>
        <Paper elevation={0} sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ mr: "20px" }}>
            <Typography variant="h2" color="textPrimary" gutterBottom sx={{ fontFamily: "Montserrat", fontWeight: "bold", fontSize: "20px" }}>
              {t("qrCodeModal.title")}
            </Typography>
            <Typography variant="body1" color="textPrimary" gutterBottom>
              {t("qrCodeModal.steps.one")}
            </Typography>
            <Typography variant="body1" color="textPrimary" gutterBottom>
              {t("qrCodeModal.steps.two.partOne")} <MoreVertIcon sx={iconSx} /> {t("qrCodeModal.steps.two.partTwo")}{" "}
              <SettingsIcon sx={iconSx} /> {t("qrCodeModal.steps.two.partThree")}
            </Typography>
            <Typography variant="body1" color="textPrimary" gutterBottom>
              {t("qrCodeModal.steps.three")}
            </Typography>
            <Typography variant="body1" color="textPrimary" gutterBottom>
              {t("qrCodeModal.steps.four")}
            </Typography>
          </Box>
          <Box>
            {qrCode ? (
              <Box data-testid="qrcode" sx={{ backgroundColor: "#fff", p: 1, lineHeight: 0 }}>
                <QRCodeSVG value={qrCode} size={256} />
              </Box>
            ) : (
              <span>{t("qrCodeModal.waiting")}</span>
            )}
          </Box>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}
