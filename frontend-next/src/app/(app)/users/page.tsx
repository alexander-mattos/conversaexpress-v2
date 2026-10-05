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
import {
  MainContainer,
  MainHeader,
  MainHeaderButtonsWrapper,
  TableRowSkeleton,
  Title,
  mainPaperSx
} from "@/components/page/PageLayout";
import UserModal from "@/components/users/UserModal";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

interface User {
  id: number;
  name: string;
  email: string;
  profile: string;
}

// Porta de frontend/src/pages/Users.
export default function UsersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParam, setSearchParam] = useState("");
  const { items, dispatch, loading, handleScroll, reload } = useInfiniteList<User>({
    url: "/users/",
    key: "users",
    searchParam
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-user`, (data: { action: string; user?: User; userId?: number | string }) => {
      if (data.action === "update" && data.user) dispatch({ type: "UPSERT", payload: data.user });
      // Novo usuário: recarrega para respeitar a busca e a ordem da lista.
      if (data.action === "create") reload();
      if (data.action === "delete" && data.userId) dispatch({ type: "DELETE", payload: +data.userId });
    });
    return () => socket.disconnect();
  }, [companyId, userId, dispatch, reload]);

  const handleDelete = async (target: User) => {
    try {
      await api.delete(`/users/${target.id}`);
      dispatch({ type: "DELETE", payload: target.id });
      toast.success(t("users.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={`${t("users.confirmationModal.deleteTitle")} ${deleting?.name ?? ""}?`}
        open={!!deleting}
        onClose={open => !open && setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("users.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <UserModal
        open={modalOpen}
        userId={selectedId}
        onClose={() => {
          setModalOpen(false);
          setSelectedId(null);
          reload();
        }}
      />
      <MainHeader>
        <Title>{t("users.title")}</Title>
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
            {t("users.buttons.add")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" onScroll={handleScroll} sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("users.table.id")}</TableCell>
              <TableCell align="center">{t("users.table.name")}</TableCell>
              <TableCell align="center">{t("users.table.email")}</TableCell>
              <TableCell align="center">{t("users.table.profile")}</TableCell>
              <TableCell align="center">{t("users.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell align="center">{item.id}</TableCell>
                <TableCell align="center">{item.name}</TableCell>
                <TableCell align="center">{item.email}</TableCell>
                <TableCell align="center">{item.profile}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="edit user"
                    onClick={() => {
                      setSelectedId(item.id);
                      setModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" aria-label="delete user" onClick={() => setDeleting(item)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={5} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
