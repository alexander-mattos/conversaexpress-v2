"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import FileModal from "@/components/files/FileModal";
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
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

interface FileList {
  id: number;
  name: string;
}

// Porta de frontend/src/pages/Files.
export default function FilesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParam, setSearchParam] = useState("");
  const { items, dispatch, loading, handleScroll, reload } = useInfiniteList<FileList>({
    url: "/files/",
    key: "files",
    searchParam
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<FileList | null>(null);

  // O backend emitia "companyX-file" e a tela atual lia data.files: a lista
  // nunca atualizava ao vivo.
  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-file`, (data: { action: string; fileList?: FileList; fileId?: number | string }) => {
      if ((data.action === "create" || data.action === "update") && data.fileList) {
        dispatch({ type: "UPSERT", payload: { id: data.fileList.id, name: data.fileList.name } });
      }
      if (data.action === "delete" && data.fileId) dispatch({ type: "DELETE", payload: +data.fileId });
      if (data.action === "reset") reload();
    });
    return () => socket.disconnect();
  }, [companyId, userId, dispatch, reload]);

  const handleDelete = async (file: FileList) => {
    try {
      await api.delete(`/files/${file.id}`);
      dispatch({ type: "DELETE", payload: file.id });
      toast.success(t("files.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={t("files.confirmationModal.deleteTitle")}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("files.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <FileModal
        open={modalOpen}
        fileListId={selectedId}
        reload={reload}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
        }}
      />
      <MainHeader>
        <Title>
          {t("files.title")} ({items.length})
        </Title>
        <MainHeaderButtonsWrapper>
          <TextField
            variant="standard"
            placeholder={t("contacts.searchPlaceholder")}
            type="search"
            value={searchParam}
            onChange={e => setSearchParam(e.target.value.toLowerCase())}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "gray" }} />
                  </InputAdornment>
                )
              }
            }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setSelectedId(null);
              setModalOpen(true);
            }}
          >
            {t("files.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" onScroll={handleScroll} sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("files.table.name")}</TableCell>
              <TableCell align="center">{t("files.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(file => (
              <TableRow key={file.id}>
                <TableCell align="center">{file.name}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="edit file list"
                    onClick={() => {
                      setSelectedId(file.id);
                      setModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" aria-label="delete file list" onClick={() => setDeleting(file)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={2} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
