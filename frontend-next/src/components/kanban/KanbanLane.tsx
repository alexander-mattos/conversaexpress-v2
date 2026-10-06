"use client";

import { useTranslation } from "react-i18next";
import { useDroppable } from "@dnd-kit/core";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { laneKey, type Lane } from "@/lib/kanban/kanban";
import KanbanCard from "./KanbanCard";

interface Props {
  lane: Lane;
  onOpen: (uuid: string) => void;
}

export default function KanbanLane({ lane, onOpen }: Props) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: laneKey(lane.id) });
  const title = lane.tag ? lane.tag.name : t("kanban.open");

  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      data-testid="kanban-lane"
      data-lane={lane.id}
      sx={{
        width: 280,
        minWidth: 280,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        bgcolor: isOver ? "action.hover" : "background.default",
        outline: isOver ? "2px dashed" : "none",
        outlineColor: "primary.main"
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          bgcolor: lane.tag?.color || "action.selected",
          color: lane.tag ? "#fff" : "text.primary"
        }}
      >
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={lane.tickets.length}
          data-testid="kanban-lane-count"
          sx={{ bgcolor: "rgba(255,255,255,0.85)", color: "#333", fontWeight: 700 }}
        />
      </Box>
      <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", flex: 1, minHeight: 80 }}>
        {lane.tickets.map(ticket => (
          <KanbanCard key={ticket.id} ticket={ticket} onOpen={onOpen} />
        ))}
        {lane.tickets.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
            {t("kanban.empty")}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
