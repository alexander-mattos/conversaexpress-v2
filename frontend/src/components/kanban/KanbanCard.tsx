"use client";

import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useDraggable } from "@dnd-kit/core";
import { Box, Button, Paper, Typography } from "@mui/material";
import type { Ticket } from "@/lib/tickets/types";

interface Props {
  ticket: Ticket;
  onOpen: (uuid: string) => void;
  overlay?: boolean;
}

// Mesmas informações do cartão do frontend atual (react-trello).
export function KanbanCardContent({ ticket, onOpen, overlay }: Props) {
  const { t } = useTranslation();
  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, cursor: overlay ? "grabbing" : "grab", boxShadow: overlay ? 6 : 0, bgcolor: "background.paper" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
          {ticket.contact?.name ?? ""}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          {t("kanban.ticketNumber", { id: ticket.id })}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {ticket.contact?.number ?? ""}
      </Typography>
      <Typography
        variant="body2"
        sx={{ mb: 1, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
      >
        {ticket.lastMessage ?? ""}
      </Typography>
      <Button
        size="small"
        variant="contained"
        // Clicar no botão abre o ticket e não começa a arrastar o cartão.
        onPointerDown={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
        onClick={() => onOpen(ticket.uuid)}
        sx={{ bgcolor: "#10a110", color: "#fff", fontWeight: "bold", "&:hover": { bgcolor: "#0d8a0d" } }}
      >
        {t("kanban.seeTicket")}
      </Button>
    </Paper>
  );
}

export default function KanbanCard({ ticket, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `ticket-${ticket.id}`,
    data: { ticketId: ticket.id }
  });
  const style: CSSProperties = { opacity: isDragging ? 0.4 : 1, touchAction: "none" };

  return (
    <Box ref={setNodeRef} style={style} data-testid="kanban-card" data-ticket-id={ticket.id} {...attributes} {...listeners}>
      <KanbanCardContent ticket={ticket} onOpen={onOpen} />
    </Box>
  );
}
