"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface Values {
  name: string;
  number: string;
  email: string;
}
const empty: Values = { name: "", number: "", email: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Porta de frontend/src/components/ContactListItemModal.
export default function ContactListItemModal({
  open,
  onClose,
  contactListId,
  contactId,
  reload
}: {
  open: boolean;
  onClose: () => void;
  contactListId: number;
  contactId?: number | null;
  reload?: () => void;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Values>(empty);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const openKey = open ? String(contactId ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) setValues(empty);
  }

  useEffect(() => {
    if (!open || !contactId) return undefined;
    let active = true;
    api
      .get<Values>(`/contact-list-items/${contactId}`)
      .then(({ data }) => {
        if (!active) return;
        setValues({ name: data.name ?? "", number: data.number ?? "", email: data.email ?? "" });
        setFormKey(key => key + 1);
      })
      .catch(toastError);
    return () => {
      active = false;
    };
  }, [open, contactId]);

  const nameError = values.name !== "" && values.name.trim().length < 3;
  const emailError = values.email !== "" && !EMAIL.test(values.email);
  const invalid = values.name.trim().length < 3 || values.number.replace(/\D/g, "").length < 8 || emailError;

  const save = async () => {
    if (invalid) return;
    setSaving(true);
    const payload = { name: values.name.trim(), number: values.number.replace(/\D/g, ""), email: values.email.trim(), contactListId };
    try {
      if (contactId) await api.put(`/contact-list-items/${contactId}`, payload);
      else await api.post("/contact-list-items", payload);
      toast.success(t("contactLists.toasts.success"));
      reload?.();
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const field = (name: keyof Values, label: string, error?: boolean, helper?: string) => (
    <TextField
      label={label}
      value={values[name]}
      onChange={e => setValues(prev => ({ ...prev, [name]: e.target.value }))}
      error={error}
      helperText={error ? helper : " "}
      variant="outlined"
      margin="dense"
      fullWidth
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{contactId ? t("contactListItems.dialog.edit") : t("contactListItems.dialog.add")}</DialogTitle>
      <DialogContent dividers key={formKey}>
        {field("name", t("contactListItems.dialog.name"), nameError, t("contactListItems.dialog.nameShort"))}
        {field("number", t("contactListItems.dialog.number"))}
        {field("email", t("contactListItems.dialog.email"), emailError, t("contactListItems.dialog.emailInvalid"))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="outlined" disabled={saving}>
          {t("contactListItems.dialog.cancel")}
        </Button>
        <Button onClick={save} color="primary" variant="contained" disabled={saving || invalid}>
          {contactId ? t("contactListItems.dialog.okEdit") : t("contactListItems.dialog.okAdd")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
