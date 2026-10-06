"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Button,
  IconButton,
  InputAdornment,
  Link,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import ConfirmationModal from "@/components/ConfirmationModal";
import ContactListItemModal from "@/components/contactLists/ContactListItemModal";
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

interface Item {
  id: number;
  name: string;
  number: string;
  email?: string;
  isWhatsappValid?: boolean;
}

const SPREADSHEET_ACCEPT = ".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

// Porta de frontend/src/pages/ContactListItems. Importar planilha (.xlsx ou
// .csv), criar, editar e excluir só para admin.
export default function ContactListItemsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const listId = Number(id);
  const { user } = useAuth();
  const allowed = useCampaignsGuard();
  const isAdmin = user?.profile === "admin";
  const [searchParam, setSearchParam] = useState("");
  const { items, dispatch, loading, handleScroll, reload } = useInfiniteList<Item>({
    url: "/contact-list-items",
    key: "contacts",
    searchParam,
    params: { contactListId: listId },
    enabled: allowed
  });
  const [listName, setListName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!allowed) return;
    api
      .get<{ name: string }>(`/contact-lists/${listId}`)
      .then(({ data }) => setListName(data.name ?? ""))
      .catch(toastError);
  }, [allowed, listId]);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!allowed || !companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    const onItem = (data: { action: string; id?: number | string; record?: Item & { contactListId?: number } }) => {
      if (data.action === "delete" && data.id) dispatch({ type: "DELETE", payload: +data.id });
      else if (data.record && Number(data.record.contactListId) === listId) dispatch({ type: "UPSERT", payload: data.record });
      else if (data.action === "reload") reload();
    };
    socket.on(`company-${companyId}-ContactListItem`, onItem);
    socket.on(`company-${companyId}-ContactListItem-${listId}`, onItem);
    return () => socket.disconnect();
  }, [allowed, companyId, userId, listId, dispatch, reload]);

  const handleDelete = async (item: Item) => {
    try {
      await api.delete(`/contact-list-items/${item.id}`);
      dispatch({ type: "DELETE", payload: item.id });
      toast.success(t("contactListItems.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeleting(null);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", importFile);
      const { data } = await api.post<Item[]>(`/contact-lists/${listId}/upload`, form);
      toast.success(`${t("contactListItems.buttons.import")}: ${Array.isArray(data) ? data.length : 0}`);
      reload();
    } catch (err) {
      toastError(err);
    } finally {
      setImporting(false);
      setImportFile(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  if (!allowed) return null;

  return (
    <MainContainer>
      <ContactListItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contactListId={listId}
        contactId={selectedId}
        reload={reload}
      />
      <ConfirmationModal
        title={deleting ? `${t("contactListItems.confirmationModal.deleteTitle")} ${deleting.name}?` : ""}
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && handleDelete(deleting)}
      >
        {t("contactListItems.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <ConfirmationModal
        title={t("contactListItems.confirmationModal.importTitlte")}
        open={!!importFile}
        onClose={() => {
          setImportFile(null);
          if (fileInput.current) fileInput.current.value = "";
        }}
        onConfirm={handleImport}
      >
        {t("contactListItems.confirmationModal.importMessage")} <strong>{importFile?.name}</strong>
        <br />
        <Link href="/planilha.xlsx" download="planilha.xlsx">
          {t("contactListItems.download")}
        </Link>
      </ConfirmationModal>
      <input
        type="file"
        ref={fileInput}
        accept={SPREADSHEET_ACCEPT}
        style={{ display: "none" }}
        data-testid="contact-list-import-file"
        onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && setImportFile(e.target.files[0])}
      />
      <MainHeader>
        <Title>{listName || t("contactListItems.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={t("contactListItems.searchPlaceholder")}
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
          <Button variant="outlined" color="primary" onClick={() => router.push("/contact-lists")}>
            {t("contactListItems.buttons.lists")}
          </Button>
          {isAdmin && (
            <>
              <Button variant="contained" color="primary" disabled={importing} onClick={() => fileInput.current?.click()}>
                {t("contactListItems.buttons.import")}
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setSelectedId(null);
                  setModalOpen(true);
                }}
              >
                {t("contactListItems.buttons.add")}
              </Button>
            </>
          )}
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" sx={mainPaperSx} onScroll={handleScroll}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: "0%" }}>
                #
              </TableCell>
              <TableCell>{t("contactListItems.table.name")}</TableCell>
              <TableCell align="center">{t("contactListItems.table.number")}</TableCell>
              <TableCell align="center">{t("contactListItems.table.email")}</TableCell>
              {isAdmin && <TableCell align="center">{t("contactListItems.table.actions")}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id} data-testid="contact-list-item-row">
                <TableCell align="center">
                  {item.isWhatsappValid ? (
                    <CheckCircleIcon titleAccess="Whatsapp" fontSize="small" sx={{ color: "success.main" }} />
                  ) : (
                    <BlockIcon titleAccess="Whatsapp" fontSize="small" color="disabled" />
                  )}
                </TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell align="center">{item.number}</TableCell>
                <TableCell align="center">{item.email}</TableCell>
                {isAdmin && (
                  <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton
                      size="small"
                      aria-label="edit contact"
                      onClick={() => {
                        setSelectedId(item.id);
                        setModalOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" aria-label="delete contact" onClick={() => setDeleting(item)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {loading && <TableRowSkeleton columns={isAdmin ? 5 : 4} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
