"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  Autocomplete,
  Box,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputBase,
  Paper,
  Switch,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { green } from "@mui/material/colors";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import MoodIcon from "@mui/icons-material/Mood";
import SendIcon from "@mui/icons-material/Send";
import CancelIcon from "@mui/icons-material/Cancel";
import ClearIcon from "@mui/icons-material/Clear";
import MicIcon from "@mui/icons-material/Mic";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import { useAuth } from "@/contexts/AuthContext";
import { useReplyMessage } from "@/contexts/ReplyMessageContext";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import {
  AUDIO_MIN_BYTES,
  audioFileName,
  buildAudioForm,
  buildMediaForm,
  buildQuickMessageMediaForm,
  buildTextMessage,
  filterQuickMessages,
  toQuickMessageOption,
  type QuickMessageOption
} from "@/lib/messages/send";
import { BRAND } from "@/theme/tokens";
import EmojiPicker from "./EmojiPicker";
import RecordingTimer from "./RecordingTimer";

const iconSx = { color: "grey" };
const SIGN_KEY = "signOption";

const readSign = (): boolean => {
  try {
    const saved = window.localStorage.getItem(SIGN_KEY);
    return saved === null ? true : JSON.parse(saved) === true;
  } catch {
    return true;
  }
};

// Porta de frontend/src/components/MessageInputCustom.
export default function MessageInput({ ticketId, ticketStatus }: { ticketId: number; ticketStatus: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const showSign = useMediaQuery(theme.breakpoints.up("md"));
  const { user } = useAuth();
  const { replyingMessage, setReplyingMessage } = useReplyMessage();
  const recorder = useAudioRecorder();
  const [medias, setMedias] = useState<File[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [signMessage, setSignMessage] = useState(readSign);
  const [quickMessages, setQuickMessages] = useState<QuickMessageOption[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const disabled = loading || recording || ticketStatus !== "open";
  const quickOptions = filterQuickMessages(inputMessage, quickMessages);
  const userId = user?.id;
  const companyId = user?.companyId;

  useEffect(() => {
    if (!userId) return;
    api
      .get<{ shortcode: string; message: string; mediaPath?: string | null }[]>("/quick-messages/list", { params: { companyId, userId } })
      .then(({ data }) => setQuickMessages(data.map(toQuickMessageOption)))
      .catch(toastError);
  }, [companyId, userId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [replyingMessage]);

  const updateSign = (value: boolean) => {
    setSignMessage(value);
    try {
      window.localStorage.setItem(SIGN_KEY, JSON.stringify(value));
    } catch {
      // vale só para esta sessão
    }
  };

  const post = async (body: FormData | object) => {
    await api.post(`/messages/${ticketId}`, body);
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "" || !user) return;
    setLoading(true);
    try {
      await post(buildTextMessage(inputMessage, signMessage, user.name, replyingMessage));
    } catch (err) {
      toastError(err);
    }
    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
  };

  const handleUploadMedia = async () => {
    setLoading(true);
    try {
      await post(buildMediaForm(medias));
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
    setMedias([]);
  };

  const handleQuickMessage = async (option: QuickMessageOption) => {
    if (!option.mediaPath) {
      setInputMessage(option.value);
      return;
    }
    // Arquivo da resposta rápida (servido em /public): baixa e envia.
    setInputMessage("");
    setLoading(true);
    try {
      const { data } = await axios.get<Blob>(option.mediaPath, { responseType: "blob" });
      await post(buildQuickMessageMediaForm(data, option.value));
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      await recorder.start();
      setRecording(true);
    } catch (err) {
      toastError(err instanceof Error ? err.message : err);
    }
    setLoading(false);
  };

  const handleUploadAudio = async () => {
    setLoading(true);
    try {
      const blob = await recorder.stop();
      if (blob && blob.size >= AUDIO_MIN_BYTES) {
        await post(buildAudioForm(blob, audioFileName(blob.type)));
      }
    } catch (err) {
      toastError(err);
    }
    setRecording(false);
    setLoading(false);
  };

  const handleCancelAudio = async () => {
    await recorder.stop();
    setRecording(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey || loading) return;
    if (quickOptions && quickOptions.length > 0) return;
    event.preventDefault();
    handleSendMessage();
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (ticketStatus === "open" && event.clipboardData.files[0]) setMedias([event.clipboardData.files[0]]);
  };

  if (medias.length > 0) {
    return (
      <Paper
        elevation={0}
        square
        sx={{
          display: "flex",
          p: "10px 13px",
          position: "relative",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#eee",
          borderTop: "1px solid rgba(0, 0, 0, 0.12)"
        }}
      >
        <IconButton aria-label="cancel-upload" onClick={() => setMedias([])}>
          <CancelIcon sx={iconSx} />
        </IconButton>
        {loading ? (
          <div>
            <CircularProgress sx={{ color: green[500], opacity: "70%", position: "absolute", top: "20%", left: "50%", ml: "-12px" }} />
          </div>
        ) : (
          <span>{medias[0]?.name}</span>
        )}
        <IconButton aria-label="send-upload" onClick={handleUploadMedia} disabled={loading}>
          <SendIcon sx={iconSx} />
        </IconButton>
      </Paper>
    );
  }

  const renderActionButtons = () => {
    if (inputMessage) {
      return (
        <IconButton aria-label="sendMessage" onClick={handleSendMessage} disabled={loading}>
          <SendIcon sx={iconSx} />
        </IconButton>
      );
    }
    if (recording) {
      return (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton aria-label="cancelRecording" disabled={loading} onClick={handleCancelAudio}>
            <HighlightOffIcon sx={{ color: "red" }} />
          </IconButton>
          {loading ? <CircularProgress sx={{ color: green[500], opacity: "70%" }} /> : <RecordingTimer />}
          <IconButton aria-label="sendRecordedAudio" onClick={handleUploadAudio} disabled={loading}>
            <CheckCircleOutlineIcon sx={{ color: "green" }} />
          </IconButton>
        </Box>
      );
    }
    return (
      <IconButton aria-label="showRecorder" disabled={loading || ticketStatus !== "open"} onClick={handleStartRecording}>
        <MicIcon sx={iconSx} />
      </IconButton>
    );
  };

  return (
    <Paper
      square
      elevation={0}
      sx={{ bgcolor: "bordabox", display: "flex", flexDirection: "column", alignItems: "center", borderTop: "1px solid rgba(0, 0, 0, 0.12)" }}
    >
      {replyingMessage && (
        <Box sx={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", pt: 1, pl: "73px", pr: "7px" }}>
          <Box
            sx={{ flex: 1, mr: "5px", overflowY: "hidden", backgroundColor: "rgba(0, 0, 0, 0.05)", borderRadius: "7.5px", display: "flex", position: "relative" }}
          >
            <Box
              component="span"
              sx={{ flex: "none", width: "4px", backgroundColor: replyingMessage.fromMe ? BRAND.chat.receivedBubbleAccent : BRAND.chat.sentBubbleAccent }}
            />
            <Box sx={{ p: "10px", height: "auto", display: "block", whiteSpace: "pre-wrap", overflow: "hidden" }}>
              {!replyingMessage.fromMe && (
                <Box component="span" sx={{ display: "flex", color: BRAND.chat.sentBubbleAccent, fontWeight: 500 }}>
                  {replyingMessage.contact?.name}
                </Box>
              )}
              {replyingMessage.body}
            </Box>
          </Box>
          <IconButton aria-label="cancelReply" disabled={loading || ticketStatus !== "open"} onClick={() => setReplyingMessage(null)}>
            <ClearIcon sx={iconSx} />
          </IconButton>
        </Box>
      )}
      <Box sx={{ bgcolor: "newmessagebox", width: "100%", display: "flex", p: "7px", alignItems: "center" }}>
        <IconButton aria-label="emojiPicker" disabled={disabled} onClick={() => setShowEmoji(prev => !prev)}>
          <MoodIcon sx={iconSx} />
        </IconButton>
        {showEmoji && (
          <Box sx={{ position: "absolute", bottom: 63, zIndex: 10, borderTop: "1px solid #e8e8e8" }}>
            <EmojiPicker onSelect={emoji => setInputMessage(prev => prev + emoji)} />
          </Box>
        )}
        <input
          multiple
          type="file"
          id="upload-button"
          disabled={disabled}
          style={{ display: "none" }}
          onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && setMedias(Array.from(e.target.files))}
        />
        <label htmlFor="upload-button">
          <IconButton aria-label="upload" component="span" disabled={disabled}>
            <AttachFileIcon sx={iconSx} />
          </IconButton>
        </label>
        {showSign && (
          <FormControlLabel
            sx={{ mr: "7px", color: "gray" }}
            label={t("messagesInput.signMessage")}
            labelPlacement="start"
            control={<Switch size="small" checked={signMessage} onChange={e => updateSign(e.target.checked)} name="signMessage" color="primary" />}
          />
        )}
        <Box sx={{ p: "6px", mr: "7px", bgcolor: "inputdigita", display: "flex", borderRadius: "20px", flex: 1 }}>
          <Autocomplete<QuickMessageOption, false, false, true>
            freeSolo
            disabled={disabled}
            open={!disabled && !!quickOptions && quickOptions.length > 0}
            value={null}
            inputValue={inputMessage}
            options={quickOptions ?? []}
            filterOptions={list => list}
            getOptionLabel={option => (typeof option === "string" ? option : option.label)}
            onChange={(_, option) => {
              if (option && typeof option !== "string") handleQuickMessage(option);
            }}
            onInputChange={(_, value, reason) => {
              if (reason === "input") setInputMessage(value);
            }}
            sx={{ width: "100%" }}
            renderInput={params => (
              <InputBase
                ref={params.slotProps.input.ref}
                inputProps={{
                  ...params.slotProps.htmlInput,
                  // Mantém o teclado do Autocomplete e acrescenta o Enter para enviar.
                  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
                    params.slotProps.htmlInput.onKeyDown?.(event);
                    handleKeyDown(event);
                  }
                }}
                inputRef={(el: HTMLTextAreaElement | null) => {
                  inputRef.current = el;
                }}
                disabled={disabled}
                placeholder={ticketStatus === "open" ? t("messagesInput.placeholderOpen") : t("messagesInput.placeholderClosed")}
                multiline
                maxRows={5}
                autoFocus
                onPaste={handlePaste}
                sx={{ pl: "10px", flex: 1, border: "none", width: "100%" }}
              />
            )}
          />
        </Box>
        {renderActionButtons()}
      </Box>
    </Paper>
  );
}
