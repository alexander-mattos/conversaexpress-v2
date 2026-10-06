"use client";

import { Button, Divider, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { safeHttpUrl, safeImageSrc } from "@/lib/messages/reducer";

// Localização recebida: só links http(s) e imagens http(s)/data:image.
export default function LocationPreview({ image, link, description }: { image: string; link: string; description: string | null }) {
  const { t } = useTranslation();
  const safeLink = safeHttpUrl(link);
  const safeImage = safeImageSrc(image);
  const open = () => {
    if (safeLink) window.open(safeLink, "_blank", "noopener,noreferrer");
  };
  return (
    <div style={{ minWidth: "250px" }}>
      <div style={{ float: "left" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {safeImage && <img src={safeImage} alt="loc" onClick={open} style={{ width: "100px" }} />}
      </div>
      {description && (
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <Typography component="div" sx={{ mt: "12px", mx: "15px", float: "left" }} variant="subtitle1" color="primary" gutterBottom>
            <div style={{ whiteSpace: "pre-line" }}>{description.replace("\\n", "\n")}</div>
          </Typography>
        </div>
      )}
      <div style={{ display: "block", clear: "both" }} />
      <div>
        <Divider />
        <Button fullWidth color="primary" onClick={open} disabled={!safeLink}>
          {t("locationPreview.button")}
        </Button>
      </div>
    </div>
  );
}
