"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MenuItem } from "@mui/material";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { can } from "@/lib/rules";
import { toastError } from "@/lib/toastError";
import type { Ticket } from "@/lib/tickets/types";
import ScheduleModal from "./ScheduleModal";
import TransferTicketModal from "./TransferTicketModal";

// Agendar, transferir e excluir (só admin), como em TicketOptionsMenu.
export default function TicketOptionsMenu({
  ticket,
  anchorEl,
  onClose
}: {
  ticket: Ticket;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await api.delete(`/tickets/${ticket.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        keepMounted
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        open={!!anchorEl}
        onClose={onClose}
      >
        <MenuItem
          onClick={() => {
            onClose();
            setScheduleOpen(true);
          }}
        >
          {t("ticketOptionsMenu.schedule")}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setTransferOpen(true);
            onClose();
          }}
        >
          {t("ticketOptionsMenu.transfer")}
        </MenuItem>
        {can(user?.profile, "ticket-options:deleteTicket") && (
          <MenuItem
            onClick={() => {
              setConfirmationOpen(true);
              onClose();
            }}
          >
            {t("ticketOptionsMenu.delete")}
          </MenuItem>
        )}
      </Menu>
      <ConfirmationModal
        title={`${t("ticketOptionsMenu.confirmationModal.title")}${ticket.id} ${t("ticketOptionsMenu.confirmationModal.titleFrom")} ${ticket.contact.name}?`}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDelete}
      >
        {t("ticketOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>
      {transferOpen && <TransferTicketModal open={transferOpen} onClose={() => setTransferOpen(false)} ticketId={ticket.id} />}
      {scheduleOpen && <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} contactId={ticket.contact.id} />}
    </>
  );
}
