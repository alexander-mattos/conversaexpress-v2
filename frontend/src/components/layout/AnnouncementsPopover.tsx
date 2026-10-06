"use client";

import { useEffect, useState, type MouseEvent, type UIEvent } from "react";
import { useTranslation } from "react-i18next";
import { format, isValid, parseISO } from "date-fns";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Popover,
  Typography
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { BACKEND_URL } from "@/lib/api";
import { PRIORITY_COLORS, hasUnseen, markSeen, readSeen, type Announcement } from "@/lib/announcements/announcements";
import { socketManager } from "@/lib/socket";

const mediaUrl = (path?: string | null) => (path ? `${BACKEND_URL}/public/${encodeURIComponent(path)}` : undefined);
const formatDate = (value?: string) => {
  const date = value ? parseISO(value) : null;
  return date && isValid(date) ? format(date, "dd/MM/yyyy") : "";
};
const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

// Porta de frontend/src/components/AnnouncementsPopover. A bolinha some ao
// abrir e só volta para informativo novo ou alterado (guardado por usuário).
export default function AnnouncementsPopover() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, dispatch, handleScroll } = useInfiniteList<Announcement>({ url: "/announcements/", key: "records", searchParam: "" });
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const userId = user?.id;
  const [seen, setSeen] = useState<Record<string, string>>(() => (userId ? readSeen(storage(), userId) : {}));

  const companyId = user?.companyId;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    const onEvent = (data: { action: string; record?: Announcement; id?: number | string }) => {
      if ((data.action === "create" || data.action === "update") && data.record) dispatch({ type: "UPSERT", payload: data.record });
      if (data.action === "delete" && data.id) dispatch({ type: "DELETE", payload: +data.id });
    };
    socket.on("company-announcement", onEvent);
    return () => socket.off("company-announcement", onEvent);
  }, [companyId, userId, dispatch]);

  const unseen = hasUnseen(items, seen);

  const open = (event: MouseEvent<HTMLElement>) => {
    setAnchor(event.currentTarget);
    if (userId) setSeen(markSeen(storage(), userId, items));
  };

  return (
    <>
      <IconButton aria-label="announcements" onClick={open} sx={{ color: "white" }}>
        <Badge color="secondary" variant="dot" invisible={!unseen || items.length === 0} data-testid="announcements-dot">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Paper
          variant="outlined"
          onScroll={(event: UIEvent<HTMLElement>) => handleScroll(event)}
          sx={theme => ({ maxHeight: 500, maxWidth: 500, p: 1, overflowY: "scroll", ...theme.scrollbarStyles })}
        >
          <List sx={{ minWidth: 300 }}>
            {items.map(item => (
              <ListItemButton
                key={item.id}
                data-testid="announcement-item"
                onClick={() => setSelected(item)}
                sx={{ border: "1px solid #eee", borderLeft: `5px solid ${PRIORITY_COLORS[item.priority] ?? "grey"}`, cursor: "pointer" }}
              >
                {item.mediaPath && (
                  <ListItemAvatar>
                    <Avatar alt={item.mediaName ?? ""} src={mediaUrl(item.mediaPath)} />
                  </ListItemAvatar>
                )}
                <ListItemText
                  primary={item.title}
                  secondary={
                    <>
                      <Typography component="span" sx={{ fontSize: 12, display: "block" }}>
                        {formatDate(item.createdAt)}
                      </Typography>
                      <Typography component="span" sx={{ mt: "5px", display: "block", whiteSpace: "pre-wrap" }}>
                        {item.text}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
            {items.length === 0 && <ListItemText primary={t("announcements.noRecords")} />}
          </List>
        </Paper>
      </Popover>
      <Dialog open={!!selected} onClose={() => setSelected(null)}>
        <DialogTitle>{selected?.title}</DialogTitle>
        <DialogContent>
          {selected?.mediaPath && (
            <Box
              component="img"
              src={mediaUrl(selected.mediaPath)}
              alt={selected.mediaName ?? ""}
              sx={{ border: "1px solid #f1f1f1", m: "0 auto 20px", display: "block", maxWidth: 400, width: "100%", maxHeight: 300, objectFit: "contain" }}
            />
          )}
          {/* Texto como texto (nunca HTML), com as quebras de linha. */}
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{selected?.text}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)} color="primary" variant="contained">
            {t("announcements.dialog.buttons.close")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
