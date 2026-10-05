"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Autocomplete, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Chat } from "@/lib/chats/chats";
import { toastError } from "@/lib/toastError";

interface UserOption {
  id: number;
  name: string;
}

// Porta do ChatModal (frontend/src/pages/Chat). Validação por toast (antes
// era alert()) e edição sem quebrar quando o chat veio sem os usuários.
export default function ChatModal({
  open,
  chat,
  onClose,
  onSaved
}: {
  open: boolean;
  chat?: Chat | null;
  onClose: () => void;
  onSaved: (chat: Chat) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [options, setOptions] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);

  const openKey = open ? String(chat?.id ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) {
      setTitle(chat?.title ?? "");
      setUsers(
        (chat?.users ?? [])
          .filter(chatUser => chatUser.userId !== user?.id && chatUser.user)
          .map(chatUser => ({ id: chatUser.userId, name: chatUser.user?.name ?? "" }))
      );
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    api
      .get<UserOption[]>("/users/list")
      .then(({ data }) => active && setOptions(data.map(item => ({ id: item.id, name: item.name }))))
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t("chat.toasts.fillTitle"));
      return;
    }
    if (users.length === 0) {
      toast.error(t("chat.toasts.fillUser"));
      return;
    }
    setSaving(true);
    try {
      const payload = { title: title.trim(), users };
      const { data } = chat?.id ? await api.put<Chat>(`/chats/${chat.id}`, payload) : await api.post<Chat>("/chats", payload);
      onSaved(data);
      onClose();
    } catch (err) {
      toastError(err);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg">
      <DialogTitle>{t("chat.modal.title")}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              label={t("chat.modal.titleField")}
              placeholder={t("chat.modal.titleField")}
              value={title}
              onChange={e => setTitle(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { "aria-label": t("chat.modal.titleField") } }}
            />
          </Grid>
          <Grid size={12}>
            <Autocomplete
              multiple
              size="small"
              options={options.filter(option => option.id !== user?.id)}
              value={users}
              onChange={(_, value) => setUsers(value)}
              getOptionLabel={option => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderValue={(value, getItemProps) =>
                value.map((option, index) => {
                  const { key, ...itemProps } = getItemProps({ index });
                  return <Chip key={key} variant="outlined" sx={{ backgroundColor: "#bfbfbf" }} label={option.name} {...itemProps} size="small" />;
                })
              }
              renderInput={params => <TextField {...params} variant="outlined" placeholder={t("tickets.filters.user")} />}
              sx={{ minWidth: 400 }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {t("chat.buttons.close")}
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained" disabled={saving}>
          {t("chat.buttons.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
