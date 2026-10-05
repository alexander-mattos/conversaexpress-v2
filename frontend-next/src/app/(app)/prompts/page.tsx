"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button, IconButton, Paper, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import PromptModal from "@/components/prompts/PromptModal";
import {
  MainContainer,
  MainHeader,
  MainHeaderButtonsWrapper,
  TableRowSkeleton,
  Title,
  mainPaperSx
} from "@/components/page/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

interface Prompt {
  id: number;
  name: string;
  maxTokens: number;
  queue?: { id: number; name: string } | null;
}

// Porta de frontend/src/pages/Prompts.
export default function PromptsPage() {
  const allowed = usePlanGuard("useOpenAi");
  return allowed ? <Prompts /> : null;
}

function Prompts() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Todas as páginas: a tela atual mostrava só os 20 primeiros.
  const { items, dispatch, loading, reload } = useInfiniteList<Prompt>({ url: "/prompt", key: "prompts", searchParam: "", all: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Prompt | null>(null);

  // O frontend atual escutava "company-X-prompt"; o backend emite "prompt".
  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on("prompt", (data: { action: string; prompt?: Prompt; intelligenceId?: number }) => {
      if (data.action === "update" && data.prompt) reload();
      if (data.action === "delete" && data.intelligenceId) dispatch({ type: "DELETE", payload: +data.intelligenceId });
    });
    return () => socket.disconnect();
  }, [companyId, userId, dispatch, reload]);

  const handleDelete = async (prompt: Prompt) => {
    try {
      await api.delete(`/prompt/${prompt.id}`);
      dispatch({ type: "DELETE", payload: prompt.id });
      toast.success(t("prompts.toasts.deleted"));
    } catch (err) {
      // Prompt em uso numa conexão: a linha continua na lista.
      toastError(err);
    }
    setDeleting(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={`${t("prompts.confirmationModal.deleteTitle")} ${deleting?.name ?? ""}?`}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("prompts.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <PromptModal
        open={modalOpen}
        promptId={selectedId}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
        }}
      />
      <MainHeader>
        <Title>{t("prompts.title")}</Title>
        <MainHeaderButtonsWrapper>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setSelectedId(null);
              setModalOpen(true);
            }}
          >
            {t("prompts.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="left">{t("prompts.table.name")}</TableCell>
              <TableCell align="left">{t("prompts.table.queue")}</TableCell>
              <TableCell align="left">{t("prompts.table.max_tokens")}</TableCell>
              <TableCell align="center">{t("prompts.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(prompt => (
              <TableRow key={prompt.id}>
                <TableCell align="left">{prompt.name}</TableCell>
                <TableCell align="left">{prompt.queue?.name}</TableCell>
                <TableCell align="left">{prompt.maxTokens}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="edit prompt"
                    onClick={() => {
                      setSelectedId(prompt.id);
                      setModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" aria-label="delete prompt" onClick={() => setDeleting(prompt)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={4} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
