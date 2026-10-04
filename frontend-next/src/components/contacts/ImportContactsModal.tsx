"use client";

import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Typography } from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { rowsToObjects, toUploadRows } from "@/lib/contacts/sheet";

interface UploadResult {
  newContacts: { contactId: number; contactName: string }[];
  errorBag: { contactName: string; error: string | { message?: string } }[];
}

// Importação de contatos por planilha (porta de ImportContactsModal).
export default function ImportContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<{ Nome: string; Telefone: string }[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleClose = () => {
    setFileName("");
    setRows([]);
    setResult(null);
    onClose();
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const data = await readSheet(file);
      setRows(toUploadRows(rowsToObjects(data as never)));
    } catch (err) {
      setRows([]);
      toastError(err instanceof Error ? err.message : err);
    }
  };

  const handleImport = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post<UploadResult>("/contacts/upload", rows);
      setResult(data);
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>
        <Grid container sx={{ alignItems: "center" }}>
          <Grid size={6}>{t("contactImportModal.title")}</Grid>
          <Grid size={6} sx={{ textAlign: "end" }}>
            <IconButton onClick={handleClose} aria-label="close import">
              <CloseOutlinedIcon />
            </IconButton>
          </Grid>
        </Grid>
      </DialogTitle>
      <DialogContent dividers sx={{ py: "50px" }}>
        <Box sx={{ textAlign: "center" }}>
          <Box
            component="label"
            htmlFor="i-import-contacts"
            sx={{ border: "dashed", borderWidth: 2, p: "18px", cursor: "pointer", display: "inline-block", width: "70%" }}
          >
            <DownloadIcon sx={{ color: "primary.main", fontSize: 18 }} />
            <Box sx={{ textTransform: "uppercase", fontWeight: "bolder", mt: "10px" }}>{t("contactImportModal.labels.import")}</Box>
            {fileName !== "" && (
              <div>
                ({fileName} - {rows.length} {t("contactImportModal.labels.result")})
              </div>
            )}
          </Box>
          <input onChange={handleFile} style={{ display: "none" }} type="file" accept=".xlsx" id="i-import-contacts" />
        </Box>
        {result && result.newContacts.length > 0 && (
          <Box sx={{ backgroundColor: "#AAEE9C80", p: "10px", borderRadius: "8px", mt: "30px" }}>
            <Typography sx={{ fontWeight: "bolder" }}>{t("contactImportModal.labels.added")}:</Typography>
            {result.newContacts.map(contact => (
              <div key={contact.contactId}>
                {contact.contactId} | {contact.contactName} - {t("contactImportModal.labels.savedContact")}
              </div>
            ))}
          </Box>
        )}
        {result && result.errorBag.length > 0 && (
          <Box sx={{ backgroundColor: "#DD011B40", p: "10px", borderRadius: "8px", mt: "30px" }}>
            <Typography sx={{ fontWeight: "bolder" }}>{t("contactImportModal.labels.errors")}:</Typography>
            <ul>
              {result.errorBag.map((contact, index) => (
                <li key={index}>
                  {contact.contactName} - {typeof contact.error === "string" ? contact.error : contact.error?.message}
                </li>
              ))}
            </ul>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="primary" disabled={submitting} variant="outlined" href="/import-contatos.xlsx" download>
          <ImportContactsIcon sx={{ mr: "10px" }} />
          {t("contactImportModal.buttons.download")}
        </Button>
        <Button color="primary" disabled={submitting || rows.length === 0} variant="contained" onClick={handleImport}>
          {t("contactImportModal.buttons.import")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
