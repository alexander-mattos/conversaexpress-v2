"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  TextField,
  Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import PeopleIcon from "@mui/icons-material/People";
import DownloadIcon from "@mui/icons-material/GetApp";
import ConfirmationModal from "@/components/ConfirmationModal";
import ContactListDialog from "@/components/contactLists/ContactListDialog";
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
import { useCampaignsGuard } from "@/hooks/usePlanGuard";
import { api } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";

interface ContactList {
  id: number;
  name: string;
  contactsCount?: number | string;
}

// Porta de frontend/src/pages/ContactLists. Alterar só para admin.
export default function ContactListsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const allowed = useCampaignsGuard();
  const isAdmin = user?.profile === "admin";
  const [searchParam, setSearchParam] = useState("");
  const { items, dispatch, loading, handleScroll, reload } = useInfiniteList<ContactList>({
    url: "/contact-lists/",
    key: "records",
    searchParam,
    enabled: allowed
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ContactList | null>(null);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!allowed || !companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-ContactList`, (data: { action: string; id?: number | string }) => {
      if (data.action === "delete" && data.id) dispatch({ type: "DELETE", payload: +data.id });
      else reload();
    });
    return () => socket.disconnect();
  }, [allowed, companyId, userId, dispatch, reload]);

  const handleDelete = async (list: ContactList) => {
    try {
      await api.delete(`/contact-lists/${list.id}`);
      dispatch({ type: "DELETE", payload: list.id });
      toast.success(t("contactLists.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  if (!allowed) return null;

  return (
    <MainContainer>
      <ConfirmationModal
        title={deleting ? `${t("contactLists.confirmationModal.deleteTitle")} ${deleting.name}?` : ""}
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("contactLists.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ContactListDialog open={dialogOpen} onClose={() => setDialogOpen(false)} contactListId={selectedId} reload={reload} />
      <MainHeader>
        <Title>{t("contactLists.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
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
          {isAdmin && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setSelectedId(null);
                setDialogOpen(true);
              }}
            >
              {t("contactLists.buttons.add")}
            </Button>
          )}
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" sx={mainPaperSx} onScroll={handleScroll}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">{t("contactLists.table.name")}</TableCell>
              <TableCell align="center">{t("contactLists.table.contacts")}</TableCell>
              <TableCell align="center">{t("contactLists.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(list => (
              <TableRow key={list.id} data-testid="contact-list-row">
                <TableCell align="center">{list.name}</TableCell>
                <TableCell align="center">{Number(list.contactsCount) || 0}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  <Tooltip title={t("contactListItems.download")}>
                    <IconButton size="small" component="a" href="/planilha.xlsx" download="planilha.xlsx" aria-label="download sample">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" aria-label="list contacts" onClick={() => router.push(`/contact-lists/${list.id}/contacts`)}>
                    <PeopleIcon />
                  </IconButton>
                  {isAdmin && (
                    <>
                      <IconButton
                        size="small"
                        aria-label="edit list"
                        onClick={() => {
                          setSelectedId(list.id);
                          setDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" aria-label="delete list" onClick={() => setDeleting(list)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </>
                  )}
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
