"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

// Porta de frontend/src/components/ContactListDialog (só o nome).
export default function ContactListDialog({
  open,
  onClose,
  contactListId,
  reload
}: {
  open: boolean;
  onClose: () => void;
  contactListId?: number | null;
  reload?: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const openKey = open ? String(contactListId ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) setName("");
  }

  useEffect(() => {
    if (!open || !contactListId) return undefined;
    let active = true;
    api
      .get<{ name: string }>(`/contact-lists/${contactListId}`)
      .then(({ data }) => {
        if (!active) return;
        setName(data.name ?? "");
        setFormKey(key => key + 1);
      })
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open, contactListId]);

  const invalid = name.trim().length < 3;

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      if (contactListId) await api.put(`/contact-lists/${contactListId}`, { name: name.trim() });
      else await api.post("/contact-lists", { name: name.trim() });
      toast.success(t("contactLists.toasts.success"));
      reload?.();
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{contactListId ? t("contactLists.dialog.edit") : t("contactLists.dialog.add")}</DialogTitle>
      <DialogContent dividers key={formKey}>
        <TextField
          autoFocus
          label={t("contactLists.dialog.name")}
          value={name}
          onChange={e => setName(e.target.value)}
          error={name !== "" && invalid}
          helperText={name !== "" && invalid ? t("contactLists.dialog.nameShort") : " "}
          variant="outlined"
          margin="dense"
          fullWidth
          onKeyDown={e => e.key === "Enter" && save()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="outlined" disabled={saving}>
          {t("contactLists.dialog.cancel")}
        </Button>
        <Button onClick={save} color="primary" variant="contained" disabled={saving || invalid}>
          {contactListId ? t("contactLists.dialog.okEdit") : t("contactLists.dialog.okAdd")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
