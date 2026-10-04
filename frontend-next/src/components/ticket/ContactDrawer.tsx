"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, Box, Button, CardHeader, Drawer, Grid, IconButton, InputLabel, Link, Paper, Skeleton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CreateIcon from "@mui/icons-material/Create";
import ContactForm from "@/components/contacts/ContactForm";
import ContactModal from "@/components/contacts/ContactModal";
import ContactNotes from "@/components/contacts/ContactNotes";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import type { ContactRef, Ticket } from "@/lib/tickets/types";

export const DRAWER_WIDTH = 320;

const contentSx = { display: "flex", bgcolor: "contactdrawer", flexDirection: "column", p: "8px 0px 8px 8px", height: "100%", overflowY: "scroll" } as const;
const headerBoxSx = { display: "flex", p: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", "& > *": { m: "4px" } } as const;
const detailsSx = { mt: 1, p: 1, display: "flex", flexDirection: "column" } as const;
const extraInfoSx = { mt: "4px", p: "6px" } as const;

// Painel do contato à direita da conversa (porta de ContactDrawer).
export default function ContactDrawer({
  open,
  onClose,
  contact,
  ticket,
  loading
}: {
  open: boolean;
  onClose: () => void;
  contact: ContactRef | null;
  ticket: Ticket | null;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formKey, setFormKey] = useState({ open, contact });

  // Fechar/abrir o painel ou trocar de contato fecha a edição rápida.
  if (formKey.open !== open || formKey.contact !== contact) {
    setFormKey({ open, contact });
    setOpenForm(false);
  }

  return (
    <Drawer
      variant="persistent"
      anchor="right"
      open={open}
      sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}
      slotProps={{
        paper: {
          sx: {
            position: "absolute",
            width: DRAWER_WIDTH,
            display: "flex",
            borderTop: "1px solid rgba(0, 0, 0, 0.12)",
            borderRight: "1px solid rgba(0, 0, 0, 0.12)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4
          }
        }
      }}
    >
      <Box
        sx={{
          display: "flex",
          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
          bgcolor: "contactdrawer",
          alignItems: "center",
          px: 1,
          minHeight: "73px",
          justifyContent: "flex-start"
        }}
      >
        <IconButton onClick={onClose} aria-label="close contact">
          <CloseIcon />
        </IconButton>
        <Typography sx={{ justifySelf: "center" }}>{t("contactDrawer.header")}</Typography>
      </Box>
      {loading || !contact || !ticket ? (
        <Box sx={theme => ({ ...contentSx, ...theme.scrollbarStyles })}>
          <Paper square variant="outlined" sx={headerBoxSx}>
            <Grid container>
              <Grid>
                <Skeleton animation="wave" variant="circular" width={60} height={60} sx={{ m: "15px" }} />
              </Grid>
              <Grid>
                <Skeleton animation="wave" height={25} width={90} />
                <Skeleton animation="wave" height={25} width={80} />
                <Skeleton animation="wave" height={25} width={80} />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      ) : (
        <Box sx={theme => ({ ...contentSx, ...theme.scrollbarStyles })}>
          <Paper square variant="outlined" sx={headerBoxSx}>
            <CardHeader
              sx={{ cursor: "pointer", width: "100%" }}
              slotProps={{ title: { noWrap: true }, subheader: { noWrap: true } }}
              avatar={<Avatar src={contact.profilePicUrl} alt="contact_image" sx={{ width: 60, height: 60 }} />}
              title={
                <Typography onClick={() => setOpenForm(true)}>
                  {contact.name}
                  <CreateIcon sx={{ fontSize: 16, ml: "5px" }} />
                </Typography>
              }
              subheader={
                <>
                  <Typography component="span" sx={{ fontSize: 12, display: "block" }}>
                    <Link href={`tel:${contact.number}`}>{contact.number}</Link>
                  </Typography>
                  <Typography component="span" sx={{ fontSize: 12, display: "block" }}>
                    <Link href={`mailto:${contact.email}`}>{contact.email}</Link>
                  </Typography>
                </>
              }
            />
            <Button variant="outlined" color="primary" onClick={() => setModalOpen(true)} sx={{ fontSize: 12 }}>
              {t("contactDrawer.buttons.edit")}
            </Button>
            {openForm && <ContactForm initialContact={contact} onCancel={() => setOpenForm(false)} />}
          </Paper>
          <Paper square variant="outlined" sx={detailsSx}>
            <Typography variant="subtitle1" sx={{ mb: "10px" }}>
              {t("ticketOptionsMenu.appointmentsModal.title")}
            </Typography>
            <ContactNotes ticketId={ticket.id} contactId={ticket.contactId} />
          </Paper>
          <Paper square variant="outlined" sx={detailsSx}>
            <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} contactId={contact.id} />
            <Typography variant="subtitle1">{t("contactDrawer.extraInfo")}</Typography>
            {contact.extraInfo?.map((info, index) => (
              <Paper key={info.id ?? index} square variant="outlined" sx={extraInfoSx}>
                <InputLabel>{info.name}</InputLabel>
                <Typography component="div" noWrap sx={{ pt: "2px" }}>
                  <MarkdownWrapper>{info.value}</MarkdownWrapper>
                </Typography>
              </Paper>
            ))}
          </Paper>
        </Box>
      )}
    </Drawer>
  );
}
