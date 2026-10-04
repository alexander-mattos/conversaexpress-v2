"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Button,
  Chip,
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
import {
  MainContainer,
  MainHeader,
  MainHeaderButtonsWrapper,
  TableRowSkeleton,
  Title,
  mainPaperSx
} from "@/components/page/PageLayout";
import TagModal from "@/components/tags/TagModal";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

interface Tag {
  id: number;
  name: string;
  color: string;
  ticketsCount?: number | string;
}

// Porta de frontend/src/pages/Tags.
export default function TagsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParam, setSearchParam] = useState("");
  const { items, dispatch, loading, handleScroll, reload } = useInfiniteList<Tag>({
    url: "/tags/",
    key: "tags",
    searchParam
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  // O frontend atual escutava o evento "user" e nunca atualizava a lista.
  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on("tag", (data: { action: string; tag?: Tag; tagId?: number | string }) => {
      if ((data.action === "create" || data.action === "update") && data.tag) {
        reload();
      }
      if (data.action === "delete" && data.tagId) dispatch({ type: "DELETE", payload: +data.tagId });
    });
    return () => socket.disconnect();
  }, [companyId, userId, dispatch, reload]);

  const handleDelete = async (tag: Tag) => {
    try {
      await api.delete(`/tags/${tag.id}`);
      dispatch({ type: "DELETE", payload: tag.id });
      toast.success(t("tags.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={t("tags.confirmationModal.deleteTitle")}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("tags.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <TagModal
        open={modalOpen}
        tagId={selectedId}
        reload={reload}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
        }}
      />
      <MainHeader>
        <Title>{t("tags.title")}</Title>
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
            {t("tags.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" onScroll={handleScroll} sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("tags.table.name")}</TableCell>
              <TableCell align="center">{t("tags.table.tickets")}</TableCell>
              <TableCell align="center">{t("tags.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(tag => (
              <TableRow key={tag.id}>
                <TableCell align="center">
                  <Chip
                    variant="outlined"
                    size="small"
                    label={tag.name}
                    sx={{ backgroundColor: tag.color, textShadow: "1px 1px 1px #000", color: "white" }}
                  />
                </TableCell>
                <TableCell align="center">{tag.ticketsCount ?? 0}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="edit tag"
                    onClick={() => {
                      setSelectedId(tag.id);
                      setModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" aria-label="delete tag" onClick={() => setDeleting(tag)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={3} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
