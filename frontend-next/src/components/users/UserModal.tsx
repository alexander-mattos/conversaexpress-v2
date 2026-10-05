"use client";

import { useCallback, useEffect, useState } from "react";
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
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@mui/material";
import { green } from "@mui/material/colors";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { can } from "@/lib/rules";
import { toastError } from "@/lib/toastError";
import QueueSelect from "./QueueSelect";

interface UserData {
  name: string;
  email: string;
  profile: string;
  allTicket?: string | null;
  whatsappId?: number | null;
  queues?: { id: number }[];
}

interface WhatsappOption {
  id: number;
  name: string;
}

const makeSchema = (t: (key: string) => string, passwordRequired: boolean) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("userModal.formErrors.name.required"))
      .min(2, t("userModal.formErrors.name.short"))
      .max(50, t("userModal.formErrors.name.long")),
    email: z.string().trim().min(1, t("userModal.formErrors.email.required")).email(t("userModal.formErrors.email.invalid")),
    password: passwordRequired
      ? z.string().min(5, t("userModal.formErrors.password.short")).max(50, t("userModal.formErrors.password.long"))
      : z.union([z.literal(""), z.string().min(5, t("userModal.formErrors.password.short")).max(50, t("userModal.formErrors.password.long"))]),
    profile: z.string(),
    allTicket: z.string(),
    whatsappId: z.union([z.number(), z.literal("")])
  });
type Values = z.infer<ReturnType<typeof makeSchema>>;

const emptyValues: Values = { name: "", email: "", password: "", profile: "user", allTicket: "desabled", whatsappId: "" };

// Porta de frontend/src/components/UserModal. Com "me", é o Perfil do menu da
// conta: só nome, e-mail e senha, salvos em PUT /users/me.
export default function UserModal({
  open,
  onClose,
  userId,
  me = false
}: {
  open: boolean;
  onClose: () => void;
  userId?: number | null;
  me?: boolean;
}) {
  const { t } = useTranslation();
  const { user: loggedInUser } = useAuth();
  const isAdminView = !me && can(loggedInUser?.profile, "user-modal:editProfile");
  const [queueIds, setQueueIds] = useState<number[]>([]);
  const [whatsapps, setWhatsapps] = useState<WhatsappOption[]>([]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<Values>({ resolver: zodResolver(makeSchema(t, !userId)), defaultValues: emptyValues });
  // Remonta os campos depois de carregar o registro: sem isso, o rótulo podia
  // ficar por cima do valor quando os dados chegavam com o diálogo já aberto.
  const [formKey, setFormKey] = useState(0);
  const loadValues = useCallback(
    (values: Parameters<typeof reset>[0]) => {
      reset(values);
      setFormKey(key => key + 1);
    },
    [reset]
  );

  const openKey = open ? `${me ? "me" : "user"}:${userId ?? "new"}` : null;
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) setQueueIds([]);
  }

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    if (isAdminView) {
      api
        .get<WhatsappOption[]>("/whatsapp/", { params: { session: 0 } })
        .then(({ data }) => active && setWhatsapps(data))
        .catch(toastError);
    }
    if (!userId) {
      reset(emptyValues);
    } else {
      api
        .get<UserData>(`/users/${userId}`)
        .then(({ data }) => {
          if (!active) return;
          loadValues({
            name: data.name ?? "",
            email: data.email ?? "",
            password: "",
            profile: data.profile ?? "user",
            allTicket: data.allTicket ?? "desabled",
            whatsappId: data.whatsappId ?? ""
          });
          setQueueIds(data.queues?.map(queue => queue.id) ?? []);
        })
        .catch(toastError);
    }
    return () => {
      active = false;
    };
  }, [open, userId, isAdminView, reset, loadValues]);

  const onSubmit = async (values: Values) => {
    try {
      if (me) {
        await api.put("/users/me", {
          name: values.name,
          email: values.email,
          ...(values.password ? { password: values.password } : {})
        });
      } else {
        const payload = {
          name: values.name,
          email: values.email,
          ...(values.password ? { password: values.password } : {}),
          ...(isAdminView
            ? { profile: values.profile, allTicket: values.allTicket, whatsappId: values.whatsappId || null, queueIds }
            : {})
        };
        if (userId) await api.put(`/users/${userId}`, payload);
        else await api.post("/users", payload);
      }
      toast.success(t("userModal.success"));
      onClose();
    } catch (err) {
      // O modal continua aberto para corrigir (antes fechava e perdia o que foi digitado).
      toastError(err);
    }
  };

  const title = me ? t("mainDrawer.appBar.user.profile") : userId ? t("userModal.title.edit") : t("userModal.title.add");
  const lineSx = { display: "flex", "& > *:not(:last-child)": { mr: 1 } } as const;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth scroll="paper">
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers key={formKey}>
          <Box sx={lineSx}>
            <TextField
              {...register("name")}
              label={t("userModal.form.name")}
              autoFocus
              error={!!errors.name}
              helperText={errors.name?.message}
              variant="outlined"
              margin="dense"
              fullWidth
            />
            <TextField
              {...register("password")}
              label={t("userModal.form.password")}
              type="password"
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              variant="outlined"
              margin="dense"
              fullWidth
            />
          </Box>
          <Box sx={lineSx}>
            <TextField
              {...register("email")}
              label={t("userModal.form.email")}
              error={!!errors.email}
              helperText={errors.email?.message}
              variant="outlined"
              margin="dense"
              fullWidth
            />
            {isAdminView && (
              <FormControl variant="outlined" margin="dense" sx={{ minWidth: 120 }}>
                <InputLabel id="profile-selection-label">{t("userModal.form.profile")}</InputLabel>
                <Controller
                  control={control}
                  name="profile"
                  render={({ field }) => (
                    <Select {...field} labelId="profile-selection-label" label={t("userModal.form.profile")}>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="user">User</MenuItem>
                      {field.value === "supervisor" && <MenuItem value="supervisor">Supervisor</MenuItem>}
                    </Select>
                  )}
                />
              </FormControl>
            )}
          </Box>
          {isAdminView && (
            <>
              <QueueSelect selectedQueueIds={queueIds} onChange={setQueueIds} />
              <FormControl variant="outlined" margin="dense" fullWidth>
                <InputLabel id="whatsapp-selection-label">{t("userModal.form.whatsapp")}</InputLabel>
                <Controller
                  control={control}
                  name="whatsappId"
                  render={({ field }) => (
                    <Select
                      labelId="whatsapp-selection-label"
                      label={t("userModal.form.whatsapp")}
                      value={field.value}
                      onChange={e => {
                        const value = e.target.value as number | "";
                        field.onChange(value === "" ? "" : Number(value));
                      }}
                    >
                      <MenuItem value="">&nbsp;</MenuItem>
                      {whatsapps.map(whatsapp => (
                        <MenuItem key={whatsapp.id} value={whatsapp.id}>
                          {whatsapp.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {t("userModal.labels.liberations")}
              </Typography>
              <FormControl variant="outlined" margin="dense" fullWidth>
                <InputLabel id="allTicket-selection-label">{t("userModal.form.allTicket")}</InputLabel>
                <Controller
                  control={control}
                  name="allTicket"
                  render={({ field }) => (
                    <Select {...field} labelId="allTicket-selection-label" label={t("userModal.form.allTicket")}>
                      <MenuItem value="enabled">{t("userModal.form.allTicketEnabled")}</MenuItem>
                      <MenuItem value="desabled">{t("userModal.form.allTicketDesabled")}</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary" disabled={isSubmitting} variant="outlined">
            {t("userModal.buttons.cancel")}
          </Button>
          <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" sx={{ position: "relative" }}>
            {userId ? t("userModal.buttons.okEdit") : t("userModal.buttons.okAdd")}
            {isSubmitting && (
              <CircularProgress
                size={24}
                sx={{ color: green[500], position: "absolute", top: "50%", left: "50%", mt: "-12px", ml: "-12px" }}
              />
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
