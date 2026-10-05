"use client";

import { Box, ButtonBase, Dialog } from "@mui/material";

// Mesma paleta do BlockPicker (react-color) usado no frontend atual.
export const PICKER_COLORS = [
  "#B80000", "#DB3E00", "#FCCB00", "#008B02", "#006B76", "#1273DE", "#004DCF", "#5300EB",
  "#EB9694", "#FAD0C3", "#FEF3BD", "#C1E1C5", "#BEDADC", "#C4DEF6", "#BED3F3", "#D4C4FB",
  "#4D4D4D", "#999999", "#F44E3B", "#FE9200", "#FCDC00", "#DBDF00", "#A4DD00", "#68CCCA",
  "#73D8FF", "#AEA1FF", "#FDA1FF", "#333333", "#808080", "#CCCCCC", "#D33115", "#E27300",
  "#FCC400", "#B0BC00", "#68BC00", "#16A5A5", "#009CE0", "#7B64FF", "#FA28FF", "#666666",
  "#B3B3B3", "#9F0500", "#C45100", "#FB9E00", "#808900", "#194D33", "#0C797D", "#0062B1",
  "#653294", "#AB149E"
];

// Porta de frontend/src/components/ColorPicker (sem react-color).
export default function ColorPickerDialog({
  open,
  current,
  onClose,
  onChange
}: {
  open: boolean;
  current?: string;
  onClose: () => void;
  onChange: (color: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <Box sx={{ width: 170 }}>
        <Box
          sx={{
            height: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
            borderRadius: "6px 6px 0 0",
            backgroundColor: current || "#ccc"
          }}
        >
          {current}
        </Box>
        <Box sx={{ p: "10px", display: "flex", flexWrap: "wrap", gap: "10px" }} role="listbox" aria-label="colors">
          {PICKER_COLORS.map(color => (
            <ButtonBase
              key={color}
              role="option"
              aria-label={color}
              aria-selected={current?.toUpperCase() === color}
              onClick={() => {
                onChange(color);
                onClose();
              }}
              sx={{ width: 22, height: 22, borderRadius: "4px", backgroundColor: color }}
            />
          ))}
        </Box>
      </Box>
    </Dialog>
  );
}
