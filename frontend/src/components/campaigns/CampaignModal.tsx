"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField
} from "@mui/material";
import { green } from "@mui/material/colors";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import MessageVariablesPicker from "@/components/MessageVariablesPicker";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { canCancel, canEdit, canRestart, fromLocalInput, toLocalInput, type Campaign } from "@/lib/campaigns/campaigns";

const MESSAGES = ["message1", "message2", "message3", "message4", "message5"] as const;
type MessageKey = (typeof MESSAGES)[number];

const makeSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().trim().min(3, t("campaigns.dialog.form.nameShort")),
    contactListId: z.string(),
    tagListId: z.string(),
    whatsappId: z.string(),
    scheduledAt: z.string(),
    fileListId: z.string(),
    message1: z.string(),
    message2: z.string(),
    message3: z.string(),
    message4: z.string(),
    message5: z.string()
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;
const emptyValues: Values = {
  name: "",
  contactListId: "",
  tagListId: "",
  whatsappId: "",
  scheduledAt: "",
  fileListId: "",
  message1: "",
  message2: "",
  message3: "",
  message4: "",
  message5: ""
};
const MEDIA_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/3gpp,video/quicktime,audio/*,application/pdf";

interface Option {
  id: number;
  name: string;
}

const toValues = (campaign: Campaign): Values => ({
  name: campaign.name ?? "",
  contactListId: campaign.contactListId ? String(campaign.contactListId) : "",
  tagListId: campaign.tagId ? String(campaign.tagId) : "",
  whatsappId: campaign.whatsappId ? String(campaign.whatsappId) : "",
  scheduledAt: toLocalInput(campaign.scheduledAt),
  fileListId: campaign.fileListId ? String(campaign.fileListId) : "",
  message1: campaign.message1 ?? "",
  message2: campaign.message2 ?? "",
  message3: campaign.message3 ?? "",
  message4: campaign.message4 ?? "",
  message5: campaign.message5 ?? ""
});

const idOrNull = (value: string) => (value ? Number(value) : null);

// Porta de frontend/src/components/CampaignModal. Só os campos editáveis vão
// para a API; o atendente (readOnly) só visualiza.
export default function CampaignModal({
  open,
  onClose,
  campaignId,
  readOnly,
  reload
}: {
  open: boolean;
  onClose: () => void;
  campaignId?: number | null;
  readOnly?: boolean;
  reload?: () => void;
}) {
  const { t } = useTranslation();
  const [record, setRecord] = useState<Campaign | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [messageTab, setMessageTab] = useState(0);
  const [contactLists, setContactLists] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [whatsapps, setWhatsapps] = useState<Option[]>([]);
  const [files, setFiles] = useState<Option[]>([]);
  const messageRefs = useRef<Partial<Record<MessageKey, HTMLTextAreaElement | null>>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(makeSchema(t)), defaultValues: emptyValues });
  const [formKey, setFormKey] = useState(0);
  const loadValues = useCallback(
    (values: Values) => {
      reset(values);
      setFormKey(key => key + 1);
    },
    [reset]
  );

  const openKey = open ? String(campaignId ?? "new") : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) {
      setRecord(null);
      setAttachment(null);
      setMessageTab(0);
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    Promise.all([
      api.get<Option[]>("/contact-lists/list"),
      api.get<Option[]>("/tags/list"),
      api.get<Option[]>("/whatsapp/", { params: { session: 0 } }),
      api.get<Option[]>("/files/list")
    ])
      .then(([lists, tagList, connections, fileLists]) => {
        if (!active) return;
        setContactLists(lists.data ?? []);
        setTags(tagList.data ?? []);
        setWhatsapps(connections.data ?? []);
        setFiles(fileLists.data ?? []);
      })
      .catch(toastError);
    if (!campaignId) {
      reset(emptyValues);
    } else {
      api
        .get<Campaign>(`/campaigns/${campaignId}`)
        .then(({ data }) => {
          if (!active) return;
          setRecord(data);
          loadValues(toValues(data));
        })
        .catch(toastError);
    }
    return () => {
      active = false;
    };
  }, [open, campaignId, reset, loadValues]);

  const editable = !readOnly && (!record || canEdit(record));

  const uploadMedia = async (id: number) => {
    if (!attachment) return;
    const form = new FormData();
    form.append("file", attachment);
    await api.post(`/campaigns/${id}/media-upload`, form);
  };

  const onSubmit = async (values: Values) => {
    const payload = {
      name: values.name.trim(),
      contactListId: idOrNull(values.contactListId),
      tagListId: idOrNull(values.tagListId),
      whatsappId: idOrNull(values.whatsappId),
      fileListId: idOrNull(values.fileListId),
      scheduledAt: fromLocalInput(values.scheduledAt),
      message1: values.message1,
      message2: values.message2,
      message3: values.message3,
      message4: values.message4,
      message5: values.message5
    };
    try {
      if (campaignId) {
        await api.put(`/campaigns/${campaignId}`, payload);
        await uploadMedia(campaignId);
      } else {
        const { data } = await api.post<Campaign>("/campaigns", payload);
        await uploadMedia(data.id);
      }
      toast.success(t("campaigns.toasts.success"));
      reload?.();
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const removeMedia = async () => {
    if (attachment) {
      setAttachment(null);
      if (fileInput.current) fileInput.current.value = "";
    }
    if (record?.mediaPath) {
      try {
        await api.delete(`/campaigns/${record.id}/media-upload`);
        setRecord(current => (current ? { ...current, mediaPath: null, mediaName: null } : current));
        toast.success(t("campaigns.toasts.deleted"));
      } catch (err) {
        toastError(err);
      }
    }
  };

  const changeStatus = async (action: "cancel" | "restart") => {
    if (!record) return;
    try {
      await api.post(`/campaigns/${record.id}/${action}`);
      toast.success(t(`campaigns.toasts.${action}`));
      setRecord(current => (current ? { ...current, status: action === "cancel" ? "CANCELADA" : "EM_ANDAMENTO" } : current));
      reload?.();
    } catch (err) {
      toastError(err);
    }
  };

  const insertVariable = (value: string) => {
    const key = MESSAGES[messageTab];
    const el = messageRefs.current[key];
    const current = getValues(key);
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    setValue(key, `${current.substring(0, start)}${value}${current.substring(end)}`);
    setTimeout(() => el?.setSelectionRange(start + value.length, start + value.length), 100);
  };

  const select = (name: "contactListId" | "tagListId" | "whatsappId" | "fileListId", label: string, options: Option[]) => (
    <FormControl variant="outlined" margin="dense" fullWidth disabled={!editable}>
      <InputLabel id={`${name}-label`}>{label}</InputLabel>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select labelId={`${name}-label`} label={label} {...field} data-testid={`campaign-${name}`}>
            <MenuItem value="">{t("campaigns.table.notDefined")}</MenuItem>
            {options.map(option => (
              <MenuItem key={option.id} value={String(option.id)}>
                {option.name}
              </MenuItem>
            ))}
          </Select>
        )}
      />
    </FormControl>
  );

  const hasMedia = !!(record?.mediaPath || attachment);
  const title = !editable ? t("campaigns.dialog.readonly") : campaignId ? t("campaigns.dialog.update") : t("campaigns.dialog.new");

  return (
    <>
      <ConfirmationModal
        title={t("campaigns.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={removeMedia}
      >
        {t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>{title}</DialogTitle>
        <input
          type="file"
          ref={fileInput}
          accept={MEDIA_ACCEPT}
          style={{ display: "none" }}
          data-testid="campaign-file"
          onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && setAttachment(e.target.files[0])}
        />
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <DialogContent dividers key={formKey}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 9 }}>
                <TextField
                  label={t("campaigns.dialog.form.name")}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  disabled={!editable}
                  {...register("name")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>{select("contactListId", t("campaigns.dialog.form.contactList"), contactLists)}</Grid>
              <Grid size={{ xs: 12, md: 4 }}>{select("tagListId", t("campaigns.dialog.form.tagList"), tags)}</Grid>
              <Grid size={{ xs: 12, md: 4 }}>{select("whatsappId", t("campaigns.dialog.form.whatsapp"), whatsapps)}</Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label={t("campaigns.dialog.form.scheduledAt")}
                  type="datetime-local"
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  disabled={!editable}
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register("scheduledAt")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>{select("fileListId", t("campaigns.dialog.form.fileList"), files)}</Grid>
              <Grid size={12}>
                <Tabs value={messageTab} onChange={(_, value: number) => setMessageTab(value)} variant="fullWidth">
                  {MESSAGES.map((key, index) => (
                    <Tab key={key} label={`Msg. ${index + 1}`} />
                  ))}
                </Tabs>
                {MESSAGES.map((key, index) => {
                  const field = register(key);
                  return (
                    <Box key={key} sx={{ pt: 2, display: messageTab === index ? "block" : "none" }}>
                      <TextField
                        label={t(`campaigns.dialog.form.${key}`)}
                        placeholder={t("campaigns.dialog.form.messagePlaceholder")}
                        helperText={t("campaigns.dialog.form.helper")}
                        multiline
                        rows={5}
                        fullWidth
                        variant="outlined"
                        disabled={!editable}
                        name={field.name}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        inputRef={(el: HTMLTextAreaElement | null) => {
                          field.ref(el);
                          messageRefs.current[key] = el;
                        }}
                      />
                    </Box>
                  );
                })}
              </Grid>
              {editable && (
                <Grid size={12}>
                  <MessageVariablesPicker disabled={isSubmitting} onClick={insertVariable} />
                </Grid>
              )}
              {hasMedia && (
                <Grid size={12}>
                  <Button startIcon={<AttachFileIcon />}>{attachment ? attachment.name : record?.mediaName}</Button>
                  {editable && (
                    <IconButton onClick={() => setConfirmationOpen(true)} color="secondary" aria-label="remove attachment">
                      <DeleteOutlineIcon />
                    </IconButton>
                  )}
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            {!readOnly && record && canRestart(record.status) && (
              <Button color="primary" variant="outlined" onClick={() => changeStatus("restart")}>
                {t("campaigns.dialog.buttons.restart")}
              </Button>
            )}
            {!readOnly && record && canCancel(record.status) && (
              <Button color="primary" variant="outlined" onClick={() => changeStatus("cancel")}>
                {t("campaigns.dialog.buttons.cancel")}
              </Button>
            )}
            {editable && !hasMedia && (
              <Button color="primary" variant="outlined" disabled={isSubmitting} onClick={() => fileInput.current?.click()}>
                {t("campaigns.dialog.buttons.attach")}
              </Button>
            )}
            <Button onClick={onClose} color="secondary" variant="outlined" disabled={isSubmitting}>
              {t("campaigns.dialog.buttons.close")}
            </Button>
            {editable && (
              <Button type="submit" color="primary" variant="contained" disabled={isSubmitting} sx={{ position: "relative" }}>
                {campaignId ? t("campaigns.dialog.buttons.edit") : t("campaigns.dialog.buttons.add")}
                {isSubmitting && (
                  <CircularProgress size={24} sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }} />
                )}
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
}
