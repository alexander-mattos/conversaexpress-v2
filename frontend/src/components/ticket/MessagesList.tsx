"use client";

import { Fragment, useEffect, useLayoutEffect, useReducer, useRef, useState, type MouseEvent, type UIEvent } from "react";
import { useTranslation } from "react-i18next";
import { format, isSameDay, parseISO } from "date-fns";
import { Box, Button, CircularProgress, Divider, IconButton } from "@mui/material";
import { green } from "@mui/material/colors";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BlockIcon from "@mui/icons-material/Block";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GetAppIcon from "@mui/icons-material/GetApp";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { useThemeMode } from "@/contexts/ThemeModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import { messagesReducer, parseLocation } from "@/lib/messages/reducer";
import type { Message } from "@/lib/messages/types";
import { BRAND } from "@/theme/tokens";
import whatsBackground from "@/assets/wa-background.png";
import whatsBackgroundDark from "@/assets/wa-background-dark.png";
import LocationPreview from "./LocationPreview";
import MessageOptionsMenu from "./MessageOptionsMenu";
import ModalImage from "./ModalImage";

const bubble = {
  mt: "2px",
  minWidth: 100,
  maxWidth: 600,
  height: "auto",
  display: "block",
  position: "relative",
  "&:hover .message-actions": { display: "flex", position: "absolute", top: 0, right: 0 },
  whiteSpace: "pre-wrap",
  color: "#303030",
  px: "5px",
  pt: "5px",
  pb: 0,
  boxShadow: "0 1px 1px #b3b3b3"
} as const;

const leftSx = { ...bubble, mr: "20px", backgroundColor: "#ffffff", alignSelf: "flex-start", borderRadius: "0 8px 8px 8px" } as const;
const rightSx = { ...bubble, ml: "20px", backgroundColor: "#dcf8c6", alignSelf: "flex-end", borderRadius: "8px 8px 0 8px" } as const;
const textSx = { overflowWrap: "break-word", p: "3px 80px 6px 6px" } as const;
const timestampSx = { fontSize: 11, position: "absolute", bottom: 0, right: "5px", color: "#999" } as const;
const ackSx = { fontSize: 18, verticalAlign: "middle", ml: "4px" } as const;
const mediaSx = { objectFit: "cover", width: 250, height: 200, borderRadius: "8px" } as const;
const contactNameSx = { display: "flex", color: BRAND.chat.sentBubbleAccent, fontWeight: 500 } as const;
const downloadSx = { display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "inherit", p: "10px" } as const;

const QUOTED_MEDIA = ["audio", "video", "application", "image", "contactMessage"];

function DownloadButton({ url, label }: { url: string; label: string }) {
  return (
    <Box sx={downloadSx}>
      <Button startIcon={<GetAppIcon />} color="primary" variant="outlined" target="_blank" href={url}>
        {label}
      </Button>
    </Box>
  );
}

function Ack({ ack }: { ack?: number }) {
  if (ack === 1) return <AccessTimeIcon fontSize="small" sx={ackSx} />;
  if (ack === 2) return <DoneIcon fontSize="small" sx={ackSx} />;
  if (ack === 3) return <DoneAllIcon fontSize="small" sx={ackSx} />;
  if (ack === 4 || ack === 5) return <DoneAllIcon fontSize="small" sx={{ ...ackSx, color: green[500] }} />;
  return null;
}

// Porta de frontend/src/components/MessagesList. Também usada (somente
// leitura) no diálogo de "espiar" o ticket.
export default function MessagesList({ ticketId, isGroup, readOnly }: { ticketId: number; isGroup?: boolean; readOnly?: boolean }) {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const { user } = useAuth();
  const [messages, dispatch] = useReducer(messagesReducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Altura antes de inserir mensagens antigas: mantém a posição da leitura.
  const prependFrom = useRef<number | null>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get<{ messages: Message[]; hasMore: boolean }>(`/messages/${ticketId}`, { params: { pageNumber } });
        if (!active) return;
        if (pageNumber > 1 && listRef.current) prependFrom.current = listRef.current.scrollHeight;
        dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
        setHasMore(data.hasMore);
      } catch (err) {
        if (active) toastError(err);
      } finally {
        if (active) setLoading(false);
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pageNumber, ticketId]);

  // Mensagens novas e atualizações (ack, apagada, editada) do ticket.
  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on("ready", () => socket.emit("joinChatBox", `${ticketId}`));
    socket.on(`company-${companyId}-appMessage`, (data: { action: string; message: Message }) => {
      if (data.message?.ticketId !== ticketId) return;
      if (data.action === "create") {
        stickToBottom.current = true;
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
      }
      if (data.action === "update") dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
    });
    return () => socket.disconnect();
  }, [companyId, userId, ticketId]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || messages.length === 0) return;
    if (prependFrom.current !== null) {
      list.scrollTop = list.scrollHeight - prependFrom.current;
      prependFrom.current = null;
    } else if (stickToBottom.current) {
      bottomRef.current?.scrollIntoView();
      stickToBottom.current = false;
    }
  }, [messages]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasMore || loading) return;
    if (event.currentTarget.scrollTop < 50) {
      setLoading(true);
      setPageNumber(prev => prev + 1);
    }
  };

  const openOptions = (event: MouseEvent<HTMLElement>, message: Message) => {
    setAnchorEl(event.currentTarget);
    setSelected(message);
  };

  const renderMedia = (message: Message) => {
    if (message.mediaType === "locationMessage") {
      const location = parseLocation(message.body);
      return location ? <LocationPreview {...location} /> : null;
    }
    if (!message.mediaUrl) return null;
    if (message.mediaType === "image") return <ModalImage imageUrl={message.mediaUrl} />;
    if (message.mediaType === "audio") {
      return (
        <audio controls>
          <source src={message.mediaUrl} type="audio/ogg" />
        </audio>
      );
    }
    if (message.mediaType === "video") return <Box component="video" sx={mediaSx} src={message.mediaUrl} controls />;
    return (
      <>
        <DownloadButton url={message.mediaUrl} label={t("messagesList.header.buttons.download")} />
        <div style={{ marginBottom: message.body === "" ? 8 : 0 }}>
          <Divider />
        </div>
      </>
    );
  };

  const renderQuoted = (message: Message) => {
    const quoted = message.quotedMsg;
    if (!quoted) return null;
    return (
      <Box
        sx={{
          m: "-3px -80px 6px -6px",
          overflow: "hidden",
          backgroundColor: message.fromMe ? "#cfe9ba" : "#f0f0f0",
          borderRadius: "7.5px",
          display: "flex",
          position: "relative"
        }}
      >
        <Box
          component="span"
          sx={{ flex: "none", width: "4px", backgroundColor: quoted.fromMe ? BRAND.chat.receivedBubbleAccent : BRAND.chat.sentBubbleAccent }}
        />
        <Box sx={{ p: "10px", maxWidth: 300, height: "auto", display: "block", whiteSpace: "pre-wrap", overflow: "hidden" }}>
          {!quoted.fromMe && (
            <Box component="span" sx={contactNameSx}>
              {quoted.contact?.name}
            </Box>
          )}
          {quoted.mediaType === "audio" && quoted.mediaUrl && (
            <Box sx={downloadSx}>
              <audio controls>
                <source src={quoted.mediaUrl} type="audio/ogg" />
              </audio>
            </Box>
          )}
          {quoted.mediaType === "video" && quoted.mediaUrl && <Box component="video" sx={mediaSx} src={quoted.mediaUrl} controls />}
          {quoted.mediaType === "application" && quoted.mediaUrl && (
            <DownloadButton url={quoted.mediaUrl} label={t("messagesList.header.buttons.download")} />
          )}
          {quoted.mediaType === "image" && quoted.mediaUrl && <ModalImage imageUrl={quoted.mediaUrl} />}
          {quoted.mediaType === "contactMessage" && <span>{quoted.body}</span>}
          {/* O frontend atual não mostrava o texto da mensagem citada. */}
          {!QUOTED_MEDIA.includes(quoted.mediaType ?? "") && <MarkdownWrapper>{quoted.body}</MarkdownWrapper>}
        </Box>
      </Box>
    );
  };

  const actionsButton = (message: Message) =>
    readOnly ? null : (
      <IconButton
        size="small"
        className="message-actions"
        disabled={message.isDeleted}
        aria-label="message options"
        onClick={e => openOptions(e, message)}
        sx={{
          display: "none",
          position: "relative",
          color: "#999",
          zIndex: 1,
          backgroundColor: "inherit",
          opacity: "90%",
          "&:hover, &.Mui-focusVisible": { backgroundColor: "inherit" }
        }}
      >
        <ExpandMoreIcon />
      </IconButton>
    );

  const separators = (message: Message, index: number) => {
    const day = parseISO(message.createdAt);
    const newDay = index === 0 || !isSameDay(day, parseISO(messages[index - 1].createdAt));
    const newSide = index > 0 && message.fromMe !== messages[index - 1].fromMe;
    return (
      <>
        {newDay && (
          <Box
            component="span"
            sx={{
              alignItems: "center",
              textAlign: "center",
              alignSelf: "center",
              width: "110px",
              backgroundColor: "#e1f3fb",
              m: "10px",
              borderRadius: "10px",
              boxShadow: "0 1px 1px #b3b3b3"
            }}
          >
            <Box sx={{ color: "#808888", p: 1, alignSelf: "center", ml: 0 }}>{format(day, "dd/MM/yyyy")}</Box>
          </Box>
        )}
        {newSide && <span style={{ marginTop: 16 }} />}
      </>
    );
  };

  const renderMessage = (message: Message, index: number) => {
    const time = format(parseISO(message.createdAt), "HH:mm");
    const body = message.mediaType === "locationMessage" ? null : message.body;
    const hasMedia = !!message.mediaUrl || message.mediaType === "locationMessage" || message.mediaType === "vcard";

    if (message.mediaType === "call_log") {
      return (
        <Fragment key={message.id}>
          {separators(message, index)}
          <div>
            {actionsButton(message)}
            {isGroup && (
              <Box component="span" sx={contactNameSx}>
                {message.contact?.name}
              </Box>
            )}
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 17" width="20" height="17">
                <path
                  fill="#df3333"
                  d="M18.2 12.1c-1.5-1.8-5-2.7-8.2-2.7s-6.7 1-8.2 2.7c-.7.8-.3 2.3.2 2.8.2.2.3.3.5.3 1.4 0 3.6-.7 3.6-.7.5-.2.8-.5.8-1v-1.3c.7-1.2 5.4-1.2 6.4-.1l.1.1v1.3c0 .2.1.4.2.6.1.2.3.3.5.4 0 0 2.2.7 3.6.7.2 0 1.4-2 .5-3.1zM5.4 3.2l4.7 4.6 5.8-5.7-.9-.8L10.1 6 6.4 2.3h2.5V1H4.1v4.8h1.3V3.2z"
                />
              </svg>{" "}
              <span>
                {t("messagesList.lostCall")} {time}
              </span>
            </div>
          </div>
        </Fragment>
      );
    }

    if (!message.fromMe) {
      return (
        <Fragment key={message.id}>
          {separators(message, index)}
          <Box sx={leftSx} data-testid="message-left">
            {actionsButton(message)}
            {isGroup && (
              <Box component="span" sx={contactNameSx}>
                {message.contact?.name}
              </Box>
            )}
            {message.isDeleted && (
              <div>
                <span>
                  {t("messagesList.deletedMessage")} &nbsp;
                  <BlockIcon color="error" fontSize="small" sx={{ fontSize: 18, verticalAlign: "middle", mr: "4px" }} />
                </span>
              </div>
            )}
            {hasMedia && renderMedia(message)}
            <Box sx={textSx}>
              {renderQuoted(message)}
              <MarkdownWrapper>{body}</MarkdownWrapper>
              <Box component="span" sx={timestampSx}>
                {message.isEdited && <span>Editada </span>}
                {time}
              </Box>
            </Box>
          </Box>
        </Fragment>
      );
    }

    return (
      <Fragment key={message.id}>
        {separators(message, index)}
        <Box sx={rightSx} data-testid="message-right">
          {actionsButton(message)}
          {hasMedia && renderMedia(message)}
          <Box
            sx={{
              ...textSx,
              ...(message.isDeleted && { fontStyle: "italic", color: "rgba(0, 0, 0, 0.36)" }),
              ...(message.isEdited && { p: "3px 120px 6px 6px" })
            }}
          >
            {message.isDeleted && <BlockIcon color="disabled" fontSize="small" sx={{ fontSize: 18, verticalAlign: "middle", mr: "4px" }} />}
            {renderQuoted(message)}
            <MarkdownWrapper>{body}</MarkdownWrapper>
            <Box component="span" sx={timestampSx}>
              {message.isEdited && <span>{t("messagesList.edited")}</span>}
              {time}
              <Ack ack={message.ack} />
            </Box>
          </Box>
        </Box>
      </Fragment>
    );
  };

  return (
    <Box sx={{ overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", flexGrow: 1, width: "100%", minWidth: 300, minHeight: 200 }}>
      {!readOnly && <MessageOptionsMenu message={selected} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} />}
      <Box
        id="messagesList"
        ref={listRef}
        onScroll={handleScroll}
        sx={theme => ({
          backgroundImage: `url(${(mode === "light" ? whatsBackground : whatsBackgroundDark).src})`,
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          p: "20px",
          overflowY: "scroll",
          ...theme.scrollbarStyles
        })}
      >
        {messages.length > 0 ? messages.map(renderMessage) : !loading && <div>{t("messagesList.saudation")}</div>}
        <div ref={bottomRef} style={{ float: "left", clear: "both" }} />
      </Box>
      {loading && (
        <div>
          <CircularProgress sx={{ color: green[500], position: "absolute", opacity: "70%", top: 0, left: "50%", mt: "12px" }} />
        </div>
      )}
    </Box>
  );
}
