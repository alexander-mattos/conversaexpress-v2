"use client";

import { Checkbox, FormControl, ListItemText, MenuItem, Select } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { Queue } from "@/contexts/AuthContext";

export default function TicketsQueueSelect({
  userQueues,
  selectedQueueIds,
  onChange
}: {
  userQueues: Queue[];
  selectedQueueIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ width: 120, marginTop: -4, marginLeft: 6 }}>
      <FormControl fullWidth margin="dense">
        <Select
          multiple
          displayEmpty
          size="small"
          variant="outlined"
          value={selectedQueueIds}
          onChange={e => onChange(e.target.value as number[])}
          MenuProps={{
            anchorOrigin: { vertical: "bottom", horizontal: "left" },
            transformOrigin: { vertical: "top", horizontal: "left" }
          }}
          renderValue={() => t("ticketsQueueSelect.placeholder")}
        >
          {userQueues.map(queue => (
            <MenuItem dense key={queue.id} value={queue.id}>
              <Checkbox
                sx={{ color: queue.color, "&.Mui-checked": { color: queue.color } }}
                size="small"
                color="primary"
                checked={selectedQueueIds.includes(queue.id)}
              />
              <ListItemText primary={queue.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
