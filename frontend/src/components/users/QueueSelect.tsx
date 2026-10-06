"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Chip, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface Queue {
  id: number;
  name: string;
  color: string;
}

// Porta de frontend/src/components/QueueSelect (seleção múltipla com chips).
export default function QueueSelect({ selectedQueueIds, onChange }: { selectedQueueIds: number[]; onChange: (ids: number[]) => void }) {
  const { t } = useTranslation();
  const [queues, setQueues] = useState<Queue[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get<Queue[]>("/queue")
      .then(({ data }) => active && setQueues(data))
      .catch(toastError);
    return () => {
      active = false;
    };
  }, []);

  const label = t("queueSelect.inputLabel");
  return (
    <FormControl fullWidth margin="dense" variant="outlined">
      <InputLabel id="queue-select-label" shrink>
        {label}
      </InputLabel>
      <Select
        labelId="queue-select-label"
        label={label}
        notched
        multiple
        value={selectedQueueIds}
        onChange={e => onChange((e.target.value as number[]).map(Number))}
        renderValue={selected => (
          <Box sx={{ display: "flex", flexWrap: "wrap" }}>
            {selected.map(id => {
              const queue = queues.find(q => q.id === id);
              return queue ? (
                <Chip key={id} variant="outlined" label={queue.name} sx={{ m: "2px", backgroundColor: queue.color }} />
              ) : null;
            })}
          </Box>
        )}
      >
        {queues.map(queue => (
          <MenuItem key={queue.id} value={queue.id}>
            {queue.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
