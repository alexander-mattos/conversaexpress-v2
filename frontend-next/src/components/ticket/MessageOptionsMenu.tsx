"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MenuItem } from "@mui/material";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useReplyMessage } from "@/contexts/ReplyMessageContext";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import type { Message } from "@/lib/messages/types";

// Responder e apagar (só as enviadas por nós), como hoje.
export default function MessageOptionsMenu({
  message,
  anchorEl,
  onClose
}: {
  message: Message | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { setReplyingMessage } = useReplyMessage();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Message | null>(null);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/messages/${toDelete.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <ConfirmationModal
        title={t("messageOptionsMenu.confirmationModal.title")}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDelete}
      >
        {t("messageOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        open={!!anchorEl}
        onClose={onClose}
      >
        {message?.fromMe && (
          <MenuItem
            onClick={() => {
              setToDelete(message);
              setConfirmationOpen(true);
              onClose();
            }}
          >
            {t("messageOptionsMenu.delete")}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setReplyingMessage(message);
            onClose();
          }}
        >
          {t("messageOptionsMenu.reply")}
        </MenuItem>
      </Menu>
    </>
  );
}
