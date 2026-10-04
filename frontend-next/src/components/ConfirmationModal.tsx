"use client";

import type { ReactNode } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

// Porta de frontend/src/components/ConfirmationModal.
export default function ConfirmationModal({
  title,
  children,
  open,
  onClose,
  onConfirm
}: {
  title: string;
  children?: ReactNode;
  open: boolean;
  onClose: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={() => onClose(false)} aria-labelledby="confirm-dialog">
      <DialogTitle id="confirm-dialog">{title}</DialogTitle>
      <DialogContent dividers>
        <Typography>{children}</Typography>
      </DialogContent>
      <DialogActions>
        {/* "default" do v4: cinza claro */}
        <Button variant="contained" onClick={() => onClose(false)} sx={{ bgcolor: "#e0e0e0", color: "rgba(0, 0, 0, 0.87)", "&:hover": { bgcolor: "#d5d5d5" } }}>
          {t("confirmationModal.buttons.cancel")}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            onClose(false);
            onConfirm();
          }}
        >
          {t("confirmationModal.buttons.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
