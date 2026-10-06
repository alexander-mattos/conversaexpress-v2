"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export default function RecordingTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <Box sx={{ display: "flex", ml: "10px", mr: "10px", alignItems: "center" }}>
      <span>{`${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`}</span>
    </Box>
  );
}
