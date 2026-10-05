"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Avatar,
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
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import ContactModal from "@/components/contacts/ContactModal";
import ImportContactsModal from "@/components/contacts/ImportContactsModal";
import { MainContainer, MainHeader, MainHeaderButtonsWrapper, TableRowSkeleton, Title, mainPaperSx } from "@/components/page/PageLayout";
import NewTicketModal from "@/components/tickets/NewTicketModal";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { api } from "@/lib/api";
import { contactsCsv } from "@/lib/contacts/sheet";
import { can } from "@/lib/rules";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import type { Ticket } from "@/lib/tickets/types";

interface Contact {
  id: number;
  name: string;
  number: string;
  email: string;
  profilePicUrl?: string;
}

// Porta de frontend/src/pages/Contacts.
export default function ContactsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [searchParam, setSearchParam] = useState("");
  const { items: contacts, dispatch, loading, handleScroll } = useInfiniteList<Contact>({ url: "/contacts/", key: "contacts", searchParam });
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [ticketContact, setTicketContact] = useState<Contact | null>(null);
  const [exporting, setExporting] = useState(false);

  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    socket.on(`company-${companyId}-contact`, (data: { action: string; contact?: Contact; contactId?: number }) => {
      if ((data.action === "update" || data.action === "create") && data.contact) dispatch({ type: "UPSERT", payload: data.contact });
      if (data.action === "delete" && data.contactId) dispatch({ type: "DELETE", payload: +data.contactId });
    });
    return () => socket.disconnect();
  }, [companyId, userId, dispatch]);

  const handleDelete = async (contact: Contact) => {
    try {
      await api.delete(`/contacts/${contact.id}`);
      dispatch({ type: "DELETE", payload: contact.id });
      toast.success(t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
  };

  // Exporta todos os contatos (o frontend atual exportava só os já carregados).
  const handleExport = async () => {
    setExporting(true);
    try {
      const all: Contact[] = [];
      for (let page = 1; ; page += 1) {
        const { data } = await api.get<{ contacts: Contact[]; hasMore: boolean }>("/contacts/", { params: { searchParam: "", pageNumber: page } });
        all.push(...data.contacts);
        if (!data.hasMore) break;
      }
      const url = URL.createObjectURL(new Blob([contactsCsv(all)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "contatos.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err);
    }
    setExporting(false);
  };

  return (
    <MainContainer>
      <ImportContactsModal open={importOpen} onClose={() => setImportOpen(false)} />
      {ticketContact && (
        <NewTicketModal
          open
          initialContact={ticketContact}
          onClose={(ticket?: Ticket) => {
            setTicketContact(null);
            if (ticket?.uuid) router.push(`/tickets/${ticket.uuid}`);
          }}
        />
      )}
      <ContactModal
        open={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          setSelectedContactId(null);
        }}
        contactId={selectedContactId}
      />
      <ConfirmationModal
        title={`${t("contacts.confirmationModal.deleteTitle")} ${deletingContact?.name ?? ""}?`}
        open={!!deletingContact}
        onClose={open => !open && setDeletingContact(null)}
        onConfirm={() => deletingContact && handleDelete(deletingContact)}
      >
        {t("contacts.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <MainHeader>
        <Title>{t("contacts.title")}</Title>
        <MainHeaderButtonsWrapper>
          <TextField
            placeholder={t("contacts.searchPlaceholder")}
            type="search"
            variant="standard"
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
          {can(user?.profile, "contacts-page:deleteContact") && (
            <Button variant="contained" color="primary" onClick={() => setImportOpen(true)}>
              {t("contacts.buttons.import")}
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setSelectedContactId(null);
              setContactModalOpen(true);
            }}
          >
            {t("contacts.buttons.add")}
          </Button>
          <Button variant="contained" color="primary" onClick={handleExport} disabled={exporting}>
            {t("contacts.buttons.export")}
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>
      <Paper variant="outlined" onScroll={handleScroll} sx={theme => ({ ...mainPaperSx, ...theme.scrollbarStyles })}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell>{t("contacts.table.name")}</TableCell>
              <TableCell align="center">{t("contacts.table.whatsapp")}</TableCell>
              <TableCell align="center">{t("contacts.table.email")}</TableCell>
              <TableCell align="center">{t("contacts.table.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.map(contact => (
              <TableRow key={contact.id}>
                <TableCell sx={{ pr: 0 }}>
                  <Avatar src={contact.profilePicUrl} />
                </TableCell>
                <TableCell>{contact.name}</TableCell>
                <TableCell align="center">{contact.number}</TableCell>
                <TableCell align="center">{contact.email}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" aria-label="open ticket" onClick={() => setTicketContact(contact)}>
                    <WhatsAppIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="edit contact"
                    onClick={() => {
                      setSelectedContactId(contact.id);
                      setContactModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  {can(user?.profile, "contacts-page:deleteContact") && (
                    <IconButton size="small" aria-label="delete contact" onClick={() => setDeletingContact(contact)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {loading && <TableRowSkeleton avatar columns={3} />}
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
}
