"use client";

import { useState } from "react";
import { IconButton, Popover, Slider, Stack } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeDownIcon from "@mui/icons-material/VolumeDown";

// Volume dos alertas sonoros, salvo no navegador como hoje ("volume").
export default function NotificationsVolume({
  volume,
  setVolume
}: {
  volume: number;
  setVolume: (value: number) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleChange = (value: number) => {
    setVolume(value);
    try {
      window.localStorage.setItem("volume", String(value));
    } catch {
      // vale só para esta sessão
    }
  };

  return (
    <>
      <IconButton onClick={e => setAnchorEl(prev => (prev ? null : e.currentTarget))} aria-label="Open Notifications" sx={{ color: "#fff" }}>
        <VolumeUpIcon color="inherit" />
      </IconButton>
      <Popover
        disableScrollLock
        open={!!anchorEl}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: "100%", maxWidth: { xs: 270, md: 350 }, ml: 2, mr: 1 } } }}
      >
        <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: "center" }}>
          <VolumeDownIcon />
          <Slider
            value={volume}
            aria-labelledby="continuous-slider"
            step={0.1}
            min={0}
            max={1}
            onChange={(_, value) => handleChange(value as number)}
          />
          <VolumeUpIcon />
        </Stack>
      </Popover>
    </>
  );
}
