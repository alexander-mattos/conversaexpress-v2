"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
  createFilterOptions
} from "@mui/material";
import ContactModal, { type SavedContact } from "@/components/contacts/ContactModal";
import { useAuth, type Queue } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import type { Ticket } from "@/lib/tickets/types";

interface ContactOption {
  id?: number;
  name: string;
  number?: string;
}

interface WhatsappOption {
  id: number;
  name: string;
  status: string;
}

const filter = createFilterOptions<ContactOption>({ trim: true });

const optionLabel = (option: ContactOption | string) =>
  typeof option === "string" ? option : option.number ? `${option.name} - ${option.number}` : option.name;

// Porta de frontend/src/components/NewTicketModal.
export default function NewTicketModal({ open, onClose }: { open: boolean; onClose: (ticket?: Ticket) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [options, setOptions] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<number | "">("");
  const [selectedWhatsapp, setSelectedWhatsapp] = useState<number | "">(user?.whatsappId ?? "");
  const [whatsapps, setWhatsapps] = useState<WhatsappOption[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [newContact, setNewContact] = useState<{ name: string } | undefined>();
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Conexões e filas (admin vê todas as filas; os demais, as suas).
  useEffect(() => {
    if (!user) return;
    api
      .get<WhatsappOption[]>("/whatsapp", { params: { companyId: user.companyId, session: 0 } })
      .then(({ data }) => setWhatsapps(data))
      .catch(toastError);
    const pickQueues = (list: Queue[]) => {
      setQueues(list);
      if (list.length === 1) setSelectedQueue(list[0].id);
    };
    if (user.profile !== "admin") {
      pickQueues(user.queues);
      return;
    }
    api
      .get<Queue[]>("/queue")
      .then(({ data }) => pickQueues(data))
      .catch(() => toastError(t("newTicketModal.searchQueueError")));
  }, [user, t]);

  // Busca de contatos a partir de 3 letras.
  useEffect(() => {
    if (!open || searchParam.length < 3) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ contacts: ContactOption[] }>("/contacts", { params: { searchParam } });
        if (active) setOptions(data.contacts);
      } catch (err) {
        toastError(err);
      } finally {
        if (active) setLoading(false);
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchParam, open]);

  if (!user) return null;

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setSelectedContact(null);
  };

  const handleSaveTicket = async (contactId?: number) => {
    if (!contactId) return;
    if (selectedQueue === "" && user.profile !== "admin") {
      toast.error(t("newTicketModal.selectQueue"));
      return;
    }
    setLoading(true);
    try {
      const { data: ticket } = await api.post<Ticket>("/tickets", {
        contactId,
        queueId: selectedQueue !== "" ? selectedQueue : null,
        whatsappId: selectedWhatsapp !== "" ? selectedWhatsapp : null,
        userId: user.id,
        status: "open"
      });
      onClose(ticket);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (value: ContactOption | string | null) => {
    if (value && typeof value !== "string" && value.number) {
      setSelectedContact(value);
    } else if (value && typeof value !== "string" && value.name) {
      setNewContact({ name: value.name });
      setContactModalOpen(true);
    }
  };

  return (
    <>
      <ContactModal
        open={contactModalOpen}
        initialValues={newContact}
        onClose={() => setContactModalOpen(false)}
        onSave={(contact: SavedContact) => handleSaveTicket(contact.id)}
      />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{t("newTicketModal.title")}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ width: 300 }}>
            <Grid size={12}>
              <Autocomplete<ContactOption, false, false, true>
                fullWidth
                options={options}
                loading={loading}
                clearOnBlur
                autoHighlight
                freeSolo
                clearOnEscape
                getOptionLabel={optionLabel}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <li key={key} {...rest}>
                      {option.number ? (
                        <Typography component="span" sx={{ fontSize: 14, ml: "10px", display: "inline-flex", alignItems: "center", lineHeight: 2 }}>
                          {option.name} - {option.number}
                        </Typography>
                      ) : (
                        `${t("newTicketModal.add")} ${option.name}`
                      )}
                    </li>
                  );
                }}
                filterOptions={(list, params) => {
                  const filtered = filter(list, params);
                  if (params.inputValue !== "" && !loading && searchParam.length >= 3) {
                    filtered.push({ name: params.inputValue });
                  }
                  return filtered;
                }}
                onChange={(_, value) => handleSelectOption(value)}
                renderInput={params => (
                  <TextField
                    {...params}
                    label={t("newTicketModal.fieldLabel")}
                    variant="outlined"
                    autoFocus
                    onChange={e => setSearchParam(e.target.value)}
                    onKeyDown={e => {
                      if (!loading && selectedContact && e.key === "Enter") handleSaveTicket(selectedContact.id);
                    }}
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps.input,
                        endAdornment: (
                          <>
                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.slotProps.input.endAdornment}
                          </>
                        )
                      }
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={12}>
              <Select
                required
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedQueue}
                onChange={e => setSelectedQueue(e.target.value as number)}
                renderValue={() =>
                  selectedQueue === "" ? t("newTicketModal.selectQueue") : queues.find(q => q.id === selectedQueue)?.name
                }
              >
                {queues.map(queue => (
                  <MenuItem dense key={queue.id} value={queue.id}>
                    <ListItemText primary={queue.name} />
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid size={12}>
              <Select
                required
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedWhatsapp}
                onChange={e => setSelectedWhatsapp(e.target.value as number)}
                renderValue={() =>
                  selectedWhatsapp === ""
                    ? t("newTicketModal.selectConection")
                    : whatsapps.find(w => w.id === selectedWhatsapp)?.name
                }
              >
                {whatsapps.map(whatsapp => (
                  <MenuItem dense key={whatsapp.id} value={whatsapp.id}>
                    <ListItemText
                      primary={
                        <Typography component="span" sx={{ fontSize: 14, ml: "10px", display: "inline-flex", alignItems: "center", lineHeight: 2 }}>
                          {whatsapp.name} &nbsp;
                          <Box component="span" sx={{ fontSize: 11, color: whatsapp.status === "CONNECTED" ? "#25d366" : "#e1306c" }}>
                            ({whatsapp.status})
                          </Box>
                        </Typography>
                      }
                    />
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary" disabled={loading} variant="outlined">
            {t("newTicketModal.buttons.cancel")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!selectedContact || loading}
            onClick={() => handleSaveTicket(selectedContact?.id)}
            sx={{ position: "relative" }}
          >
            {t("newTicketModal.buttons.ok")}
            {loading && <CircularProgress size={24} sx={{ position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
