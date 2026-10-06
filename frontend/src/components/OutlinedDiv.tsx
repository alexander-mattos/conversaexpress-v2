import type { ReactNode } from "react";
import { Box } from "@mui/material";

// Caixa com borda e rótulo no estilo de um TextField "outlined" (equivalente
// ao OutlinedDiv do frontend atual).
export default function OutlinedDiv({ label, children, disabled }: { label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <Box
      component="fieldset"
      sx={theme => ({
        position: "relative",
        m: "8px 0 4px",
        p: "6px 10px",
        minWidth: 0,
        width: "100%",
        border: `1px solid ${theme.palette.mode === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)"}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        opacity: disabled ? 0.6 : 1
      })}
    >
      <Box component="legend" sx={{ px: "5px", fontSize: "0.75rem", color: "text.secondary" }}>
        {label}
      </Box>
      {children}
    </Box>
  );
}
