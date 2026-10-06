"use client";

import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import axios from "axios";
import { Box, Button, CircularProgress, Grid, Paper, TextField, Typography } from "@mui/material";
import { MainContainer } from "@/components/page/PageLayout";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { BACKEND_URL } from "@/lib/api";
import { toastError } from "@/lib/toastError";

const ENDPOINT = `${BACKEND_URL}/api/messages/send`;

// Porta de frontend/src/pages/MessagesAPI. Os testes usam o token da conexão,
// não a sessão do usuário (é assim que um sistema externo chama a API).
export default function MessagesApiPage() {
  const { t } = useTranslation();
  const allowed = usePlanGuard("useExternalApi");
  const [text, setText] = useState({ token: "", number: "", body: "" });
  const [media, setMedia] = useState({ token: "", number: "" });
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState<"text" | "media" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const sendText = async (event: FormEvent) => {
    event.preventDefault();
    setSending("text");
    try {
      await axios.post(ENDPOINT, { number: text.number, body: text.body }, { headers: { Authorization: `Bearer ${text.token.trim()}` } });
      toast.success(t("messagesAPI.toasts.success"));
      setText({ token: "", number: "", body: "" });
    } catch (err) {
      toastError(err);
    } finally {
      setSending(null);
    }
  };

  const sendMedia = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setSending("media");
    try {
      const form = new FormData();
      form.append("number", media.number);
      form.append("body", file.name);
      form.append("medias", file);
      await axios.post(ENDPOINT, form, { headers: { Authorization: `Bearer ${media.token.trim()}` } });
      toast.success(t("messagesAPI.toasts.success"));
      setMedia({ token: "", number: "" });
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      toastError(err);
    } finally {
      setSending(null);
    }
  };

  if (!allowed) return null;

  const sendButton = (kind: "text" | "media", disabled: boolean) => (
    <Box sx={{ textAlign: "right" }}>
      <Button type="submit" variant="contained" disabled={disabled || sending !== null} sx={{ minWidth: 100 }}>
        {sending === kind ? <CircularProgress size={22} color="inherit" /> : t("messagesAPI.buttons.send")}
      </Button>
    </Box>
  );

  return (
    <MainContainer>
      <Paper variant="outlined" sx={{ p: 2, overflowY: "auto", flex: 1 }}>
        <Typography variant="h5">{t("messagesAPI.labels.doc")}</Typography>
        <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
          {t("messagesAPI.labels.method")}
        </Typography>
        <Box component="ol" sx={{ my: 1 }}>
          <li>{t("messagesAPI.labels.textMessage")}</li>
          <li>{t("messagesAPI.labels.mediaMessage")}</li>
        </Box>
        <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
          {t("messagesAPI.labels.instructions")}
        </Typography>
        <Box sx={{ my: 1 }}>
          <b>{t("messagesAPI.labels.observations")}</b>
          <ul>
            <li>{t("messagesAPI.labels.before1")}</li>
            <li>{t("messagesAPI.labels.before2")}</li>
            <li>
              {t("messagesAPI.labels.numberDescription")}
              <ul>
                <li>{t("messagesAPI.labels.countryCode")}</li>
                <li>DDD</li>
                <li>{t("messagesAPI.labels.number")}</li>
              </ul>
            </li>
          </ul>
        </Box>

        <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
          {t("messagesAPI.labels.textMessage2")}
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <p>{t("messagesAPI.labels.textMessageInstructions")}</p>
            <b>Endpoint: </b> <code data-testid="api-endpoint">{ENDPOINT}</code> <br />
            <b>{t("messagesAPI.labels.method2")}: </b> POST <br />
            <b>Headers: </b> Authorization (Bearer token) {t("messagesAPI.labels.e")} Content-Type (application/json) <br />
            <b>Body: </b> <code>{'{ "number": "5599999999999", "body": "Sua mensagem" }'}</code>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <b>{t("messagesAPI.labels.tests")}</b>
            <Box component="form" onSubmit={sendText} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label={t("messagesAPI.textMessage.token")} required fullWidth size="small" value={text.token} onChange={e => setText(p => ({ ...p, token: e.target.value }))} slotProps={{ htmlInput: { "data-testid": "api-text-token" } }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label={t("messagesAPI.textMessage.number")} required fullWidth size="small" value={text.number} onChange={e => setText(p => ({ ...p, number: e.target.value }))} slotProps={{ htmlInput: { "data-testid": "api-text-number" } }} />
                </Grid>
                <Grid size={12}>
                  <TextField label={t("messagesAPI.textMessage.body")} required fullWidth size="small" value={text.body} onChange={e => setText(p => ({ ...p, body: e.target.value }))} slotProps={{ htmlInput: { "data-testid": "api-text-body" } }} />
                </Grid>
                <Grid size={12}>{sendButton("text", !text.token.trim() || !text.number.trim() || !text.body.trim())}</Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>

        <Typography variant="h6" color="primary" sx={{ mt: 3 }}>
          {t("messagesAPI.labels.mediaMessage2")}
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <p>{t("messagesAPI.labels.textMessageInstructions")}</p>
            <b>Endpoint: </b> <code>{ENDPOINT}</code> <br />
            <b>{t("messagesAPI.labels.method2")}: </b> POST <br />
            <b>Headers: </b> Authorization (Bearer token) {t("messagesAPI.labels.e")} Content-Type (multipart/form-data) <br />
            <b>FormData: </b>
            <ul>
              <li>
                <b>number: </b> 5599999999999
              </li>
              <li>
                <b>medias: </b> arquivo
              </li>
            </ul>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <b>{t("messagesAPI.labels.tests")}</b>
            <Box component="form" onSubmit={sendMedia} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label={t("messagesAPI.mediaMessage.token")} required fullWidth size="small" value={media.token} onChange={e => setMedia(p => ({ ...p, token: e.target.value }))} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label={t("messagesAPI.mediaMessage.number")} required fullWidth size="small" value={media.number} onChange={e => setMedia(p => ({ ...p, number: e.target.value }))} />
                </Grid>
                <Grid size={12}>
                  <input ref={fileInput} type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} data-testid="api-media-file" />
                </Grid>
                <Grid size={12}>{sendButton("media", !media.token.trim() || !media.number.trim() || !file)}</Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </MainContainer>
  );
}
