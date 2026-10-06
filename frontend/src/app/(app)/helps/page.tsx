"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, CircularProgress, Modal, Paper, Typography } from "@mui/material";
import { MainContainer, MainHeader, Title } from "@/components/page/PageLayout";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface Help {
  id: number;
  title: string;
  description?: string;
  video: string;
}

// Porta de frontend/src/pages/Helps.
export default function HelpsPage() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<Help[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<Help[]>("/helps/list")
      .then(({ data }) => active && setRecords(data))
      .catch(err => active && toastError(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <MainContainer>
      <MainHeader>
        <Title>
          {t("helps.title")} ({records.length})
        </Title>
      </MainHeader>
      {/* Mesmo recuo duplo da tela atual (grade dentro de outra grade). */}
      <Box sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            overflowY: "auto",
            maxHeight: "calc(100vh - 200px)",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 3,
            p: 2,
            mb: 3
          }}
        >
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {!loading && records.length === 0 && (
            <Typography color="textSecondary" sx={{ p: 2 }}>
              {t("helps.empty")}
            </Typography>
          )}
          {records.map(record => (
            <Paper
              key={record.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedVideo(record.video)}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && setSelectedVideo(record.video)}
              sx={theme => ({
                position: "relative",
                width: "100%",
                minHeight: 340,
                maxWidth: 340,
                p: 2,
                boxShadow: theme.shadows[3],
                borderRadius: 1,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "transform 0.3s, box-shadow 0.3s",
                "&:hover": { transform: "scale(1.03)", boxShadow: "0 0 8px", color: "primary.main" }
              })}
            >
              <Box
                component="img"
                src={`https://img.youtube.com/vi/${encodeURIComponent(record.video)}/mqdefault.jpg`}
                alt="Thumbnail"
                sx={{ width: "100%", height: "calc(100% - 56px)", objectFit: "cover", borderRadius: "8px 8px 0 0" }}
              />
              <Typography variant="button" sx={{ mt: 1, flex: 1 }}>
                {record.title}
              </Typography>
              <Typography variant="caption" sx={{ maxHeight: 100, overflow: "hidden" }}>
                {record.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
      <Modal
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Box
          sx={{
            outline: "none",
            width: "90%",
            maxWidth: 1024,
            aspectRatio: "16/9",
            position: "relative",
            backgroundColor: "white",
            borderRadius: 1,
            overflow: "hidden"
          }}
        >
          {selectedVideo && (
            <Box
              component="iframe"
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selectedVideo)}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sx={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, border: 0 }}
            />
          )}
        </Box>
      </Modal>
    </MainContainer>
  );
}
