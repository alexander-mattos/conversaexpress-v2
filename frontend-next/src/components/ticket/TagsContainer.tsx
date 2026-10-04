"use client";

import { useEffect, useState } from "react";
import { Autocomplete, Chip, Paper, TextField } from "@mui/material";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import type { Tag, Ticket } from "@/lib/tickets/types";

// Tags do ticket: escolher existentes, criar digitando e sincronizar
// (porta de frontend/src/components/TagsContainer).
export default function TagsContainer({ ticket }: { ticket: Ticket }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selected, setSelected] = useState<Tag[]>(ticket.tags ?? []);
  const [lastTicket, setLastTicket] = useState(ticket);

  // Quando o ticket muda (socket), as tags mostradas acompanham.
  if (ticket !== lastTicket) {
    setLastTicket(ticket);
    setSelected(Array.isArray(ticket.tags) ? ticket.tags : []);
  }

  const loadTags = async () => {
    try {
      const { data } = await api.get<Tag[]>("/tags/list");
      setTags(data);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    api
      .get<Tag[]>("/tags/list")
      .then(({ data }) => setTags(data))
      .catch(toastError);
  }, []);

  const handleChange = async (value: (Tag | string)[], reason: string) => {
    let changed: Tag[] = [];
    if (reason === "createOption") {
      for (const item of value) {
        if (typeof item === "string") {
          try {
            const { data } = await api.post<Tag>("/tags", { name: item });
            changed.push(data);
          } catch (err) {
            toastError(err);
          }
        } else {
          changed.push(item);
        }
      }
      await loadTags();
    } else {
      changed = value.filter((v): v is Tag => typeof v !== "string");
    }
    setSelected(changed);
    try {
      await api.post("/tags/sync", { ticketId: ticket.id, tags: changed });
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Paper sx={{ p: "12px" }}>
      <Autocomplete<Tag, true, false, true>
        multiple
        size="small"
        options={tags}
        value={selected}
        freeSolo
        onChange={(_, value, reason) => handleChange(value, reason)}
        getOptionLabel={option => (typeof option === "string" ? option : option.name)}
        isOptionEqualToValue={(option, value) => typeof value !== "string" && option.id === value.id}
        renderValue={(value, getItemProps) =>
          value.map((option, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            const tag = typeof option === "string" ? { name: option, color: "#eee" } : option;
            return (
              <Chip
                key={key}
                variant="outlined"
                size="small"
                label={tag.name.toUpperCase()}
                sx={{
                  background: tag.color || "#eee",
                  color: "#FFF",
                  mr: "1px",
                  fontWeight: 600,
                  borderRadius: "3px",
                  fontSize: "0.8em",
                  whiteSpace: "nowrap"
                }}
                {...itemProps}
              />
            );
          })
        }
        renderInput={params => <TextField {...params} variant="outlined" placeholder="Tags" />}
        slotProps={{ paper: { sx: { width: 400, ml: "12px" } } }}
      />
    </Paper>
  );
}
