"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
  createFilterOptions
} from "@mui/material";
import { useAuth, type Queue } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface UserOption {
  id: number;
  name: string;
  queues?: Queue[];
}

interface WhatsappOption {
  id: number;
  name: string;
  status: string;
}

const filterOptions = createFilterOptions<UserOption>({ trim: true });

// Porta de frontend/src/components/TransferTicketModalCustom.
export default function TransferTicketModal({ open, onClose, ticketId }: { open: boolean; onClose: () => void; ticketId: number }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [options, setOptions] = useState<UserOption[]>([]);
  const [allQueues, setAllQueues] = useState<Queue[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<number | "">(() => (user?.queues.length === 1 ? user.queues[0].id : ""));
  const [whatsapps, setWhatsapps] = useState<WhatsappOption[]>([]);
  const [selectedWhatsapp, setSelectedWhatsapp] = useState<number | "">(user?.whatsappId ?? "");
  const companyId = user?.companyId;

  useEffect(() => {
    api
      .get<WhatsappOption[]>("/whatsapp", { params: { companyId, session: 0 } })
      .then(({ data }) => setWhatsapps(data))
      .catch(toastError);
    api
      .get<Queue[]>("/queue")
      .then(({ data }) => {
        setAllQueues(data);
        setQueues(data);
      })
      .catch(toastError);
  }, [companyId]);

  useEffect(() => {
    if (!open || searchParam.length < 3) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ users: UserOption[] }>("/users/", { params: { searchParam } });
        if (active) setOptions(data.users);
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

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setSelectedUser(null);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticketId || selectedQueue === "") return;
    setLoading(true);
    try {
      const data: Record<string, unknown> = { queueId: selectedQueue };
      if (selectedUser) data.userId = selectedUser.id;
      else {
        // Sem atendente: volta para "aguardando" na fila escolhida.
        data.status = "pending";
        data.userId = null;
      }
      if (selectedWhatsapp) data.whatsappId = selectedWhatsapp;
      await api.put(`/tickets/${ticketId}`, data);
      router.push("/tickets");
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" scroll="paper">
      <form onSubmit={handleSave}>
        <DialogTitle>{t("transferTicketModal.title")}</DialogTitle>
        <DialogContent dividers>
          <Autocomplete<UserOption, false, false, true>
            sx={{ width: 300, mb: "20px" }}
            getOptionLabel={option => (typeof option === "string" ? option : option.name)}
            onChange={(_, value) => {
              const picked = value && typeof value !== "string" ? value : null;
              setSelectedUser(picked);
              if (picked && Array.isArray(picked.queues)) {
                setQueues(picked.queues);
              } else {
                setQueues(allQueues);
                setSelectedQueue("");
              }
            }}
            options={options}
            filterOptions={filterOptions}
            freeSolo
            autoHighlight
            noOptionsText={t("transferTicketModal.noOptions")}
            loading={loading}
            renderInput={params => (
              <TextField
                {...params}
                label={t("transferTicketModal.fieldLabel")}
                variant="outlined"
                autoFocus
                onChange={e => setSearchParam(e.target.value)}
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
          <FormControl variant="outlined" fullWidth>
            <InputLabel>{t("transferTicketModal.fieldQueueLabel")}</InputLabel>
            <Select
              value={selectedQueue}
              onChange={e => setSelectedQueue(e.target.value as number)}
              label={t("transferTicketModal.fieldQueuePlaceholder")}
            >
              {queues.map(queue => (
                <MenuItem key={queue.id} value={queue.id}>
                  {queue.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Grid container spacing={2} sx={{ mt: "15px" }}>
            <Grid size={12}>
              <Select
                required
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedWhatsapp}
                onChange={e => setSelectedWhatsapp(e.target.value as number)}
                renderValue={() =>
                  selectedWhatsapp === "" ? "Selecione uma Conexão" : whatsapps.find(w => w.id === selectedWhatsapp)?.name
                }
              >
                {whatsapps.map(whatsapp => (
                  <MenuItem dense key={whatsapp.id} value={whatsapp.id}>
                    <ListItemText
                      primary={
                        <Typography component="span" sx={{ fontSize: 14, ml: "10px", display: "inline-flex", alignItems: "center", lineHeight: 2 }}>
                          {whatsapp.name} &nbsp;
                          <Box component="span">({whatsapp.status})</Box>
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
            {t("transferTicketModal.buttons.cancel")}
          </Button>
          <Button variant="contained" type="submit" color="primary" disabled={loading} sx={{ position: "relative" }}>
            {t("transferTicketModal.buttons.ok")}
            {loading && <CircularProgress size={24} sx={{ position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
