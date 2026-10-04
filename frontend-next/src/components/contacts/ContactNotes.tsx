"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { format } from "date-fns";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmationModal from "@/components/ConfirmationModal";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";

interface Note {
  id: number;
  note: string;
  createdAt: string;
  user: { name: string };
}

const schema = z.object({ note: z.string().min(1, "Required").min(2, "Too Short!") });

// Observações do contato no ticket (porta de ContactNotes).
export default function ContactNotes({ ticketId, contactId }: { ticketId: number; contactId: number }) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [toDelete, setToDelete] = useState<Note | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    formState: { errors }
  } = useForm<{ note: string }>({ resolver: zodResolver(schema), defaultValues: { note: "" } });

  const fetchNotes = useCallback(
    () => api.get<Note[]>("/ticket-notes/list", { params: { ticketId, contactId } }).then(({ data }) => data),
    [ticketId, contactId]
  );

  const loadNotes = async () => {
    setLoading(true);
    try {
      setNotes(await fetchNotes());
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes().then(setNotes).catch(toastError);
  }, [fetchNotes]);

  const onSubmit = async ({ note }: { note: string }) => {
    setLoading(true);
    try {
      await api.post("/ticket-notes", { note, ticketId, contactId });
      await loadNotes();
      reset({ note: "" });
      toast.success("Observação adicionada com sucesso!");
    } catch (err) {
      toastError(err);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setLoading(true);
    try {
      await api.delete(`/ticket-notes/${toDelete.id}`);
      await loadNotes();
      toast.success("Observação excluída com sucesso!");
    } catch (err) {
      toastError(err);
    }
    setToDelete(null);
    setLoading(false);
  };

  return (
    <>
      <ConfirmationModal title="Excluir Registro" open={!!toDelete} onClose={open => !open && setToDelete(null)} onConfirm={handleDelete}>
        Deseja realmente excluir este registro?
      </ConfirmationModal>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              rows={3}
              label={t("ticketOptionsMenu.appointmentsModal.textarea")}
              placeholder={t("ticketOptionsMenu.appointmentsModal.placeholder")}
              multiline
              error={!!errors.note}
              helperText={errors.note?.message}
              variant="outlined"
              fullWidth
              {...register("note")}
            />
          </Grid>
          {notes.length > 0 && (
            <Grid size={12}>
              <List sx={{ width: "100%", maxWidth: "350px", maxHeight: "200px", bgcolor: "background.paper", overflow: "auto" }}>
                {notes.map(note => (
                  <ListItem
                    key={note.id}
                    alignItems="flex-start"
                    secondaryAction={
                      <IconButton onClick={() => setToDelete(note)} edge="end" aria-label="delete">
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar alt={note.user?.name} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography component="span" variant="body2" color="textPrimary" sx={{ width: "100%" }}>
                          {note.note}
                        </Typography>
                      }
                      secondary={`${note.user?.name}, ${format(new Date(note.createdAt), "dd/MM/yy HH:mm")}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}
          <Grid size={12}>
            <Grid container spacing={2}>
              <Grid size={6}>
                <Button
                  onClick={() => {
                    reset({ note: "" });
                    clearErrors();
                  }}
                  color="primary"
                  variant="outlined"
                  fullWidth
                >
                  Cancelar
                </Button>
              </Grid>
              <Grid size={6}>
                <Button color="primary" type="submit" variant="contained" fullWidth disabled={loading} sx={{ position: "relative" }}>
                  Salvar
                  {loading && <CircularProgress size={24} sx={{ position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
