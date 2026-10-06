"use client";

import { useState } from "react";
import { Avatar, CardHeader } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { ContactRef, Ticket } from "@/lib/tickets/types";

// Nome do contato, número do ticket e "Atribuído à". Em telas pequenas o nome
// é encurtado, como hoje.
export default function TicketInfo({ contact, ticket, onClick }: { contact: ContactRef; ticket: Ticket; onClick: () => void }) {
  const { t } = useTranslation();
  const [narrow] = useState(() => document.body.offsetWidth < 600);
  const name = narrow && contact.name.length > 10 ? `${contact.name.substring(0, 10)}...` : contact.name;
  const userName = ticket.user ? (narrow ? ticket.user.name : `${t("messagesList.header.assignedTo")} ${ticket.user.name}`) : undefined;

  return (
    <CardHeader
      onClick={onClick}
      sx={{ cursor: "pointer" }}
      slotProps={{ title: { noWrap: true }, subheader: { noWrap: true } }}
      avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" />}
      title={`${name} #${ticket.id}`}
      subheader={userName}
    />
  );
}
