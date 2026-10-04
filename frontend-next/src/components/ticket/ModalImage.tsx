"use client";

import { useState } from "react";
import { Box, Dialog, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";

const mediaSx = { objectFit: "cover", width: 250, height: 200, borderRadius: "8px", cursor: "zoom-in" } as const;

// Miniatura que abre a imagem grande (no lugar do react-modal-image).
export default function ModalImage({ imageUrl }: { imageUrl: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Box component="img" src={imageUrl} alt="image" sx={mediaSx} onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        slotProps={{ paper: { sx: { bgcolor: "transparent", boxShadow: "none", m: 0 } }, backdrop: { sx: { bgcolor: "rgba(0,0,0,0.8)" } } }}
      >
        <Box sx={{ position: "fixed", top: 8, right: 8, display: "flex", gap: 1 }}>
          <IconButton component="a" href={imageUrl} download target="_blank" rel="noopener noreferrer" sx={{ color: "#fff" }} aria-label="download">
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={() => setOpen(false)} sx={{ color: "#fff" }} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
        <Box component="img" src={imageUrl} alt="image" sx={{ maxWidth: "90vw", maxHeight: "90vh", display: "block" }} onClick={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
