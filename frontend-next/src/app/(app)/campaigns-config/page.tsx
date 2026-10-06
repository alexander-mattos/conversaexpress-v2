"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ConfirmationModal from "@/components/ConfirmationModal";
import { MainContainer, MainHeader, Title, mainPaperSx } from "@/components/page/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaignsGuard } from "@/hooks/usePlanGuard";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import { DEFAULT_SETTINGS, isValidVariableKey, parseSettings, type CampaignSettings } from "@/lib/campaigns/campaigns";

const RANDOM = [0, 5, 10, 15, 20];
const LONGER = [0, 1, 5, 10, 15, 20, 30, 40, 60, 80, 100, 120];

// Porta de frontend/src/pages/CampaignsConfig (só admin, como a API).
export default function CampaignsConfigPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const allowed = useCampaignsGuard();
  const isAdmin = user?.profile === "admin";
  const [settings, setSettings] = useState<CampaignSettings>(DEFAULT_SETTINGS);
  const [showForm, setShowForm] = useState(false);
  const [variable, setVariable] = useState({ key: "", value: "" });
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (allowed && user && !isAdmin) {
      toast.error(t("backendErrors.ERR_NO_PERMISSION"));
      router.replace("/campaigns");
    }
  }, [allowed, user, isAdmin, router, t]);

  useEffect(() => {
    if (!allowed || !isAdmin) return;
    api
      .get<{ key: string; value: string }[]>("/campaign-settings")
      .then(({ data }) => setSettings(parseSettings(data)))
      .catch(toastError);
  }, [allowed, isAdmin]);

  const addVariable = () => {
    const key = variable.key.trim();
    if (!isValidVariableKey(key) || settings.variables.some(v => v.key === key)) {
      toast.error(t("backendErrors.ERR_CAMPAIGN_INVALID_FIELD"));
      return;
    }
    setSettings(prev => ({ ...prev, variables: [...prev.variables, { key, value: variable.value }] }));
    setVariable({ key: "", value: "" });
  };

  const save = async () => {
    try {
      await api.post("/campaign-settings", { settings });
      toast.success(t("campaigns.toasts.configSaved"));
    } catch (err) {
      toastError(err);
    }
  };

  const seconds = (value: number, zeroKey: string) =>
    value === 0 ? t(zeroKey) : `${value} ${t(value === 1 ? "campaigns.config.second" : "campaigns.config.seconds")}`;

  const intervalSelect = (name: "messageInterval" | "longerIntervalAfter" | "greaterInterval", label: string, values: number[], zeroKey: string) => (
    <FormControl variant="outlined" fullWidth>
      <InputLabel id={`${name}-label`}>{label}</InputLabel>
      <Select
        labelId={`${name}-label`}
        label={label}
        value={values.includes(settings[name]) ? settings[name] : ""}
        onChange={e => setSettings(prev => ({ ...prev, [name]: Number(e.target.value) }))}
        data-testid={`setting-${name}`}
      >
        {values.map(value => (
          <MenuItem key={value} value={value}>
            {seconds(value, zeroKey)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  if (!allowed || !isAdmin) return null;

  return (
    <MainContainer>
      <ConfirmationModal
        title={t("campaigns.confirmationModal.deleteTitle")}
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          setSettings(prev => ({ ...prev, variables: prev.variables.filter(v => v.key !== removing) }));
          setRemoving(null);
        }}
      >
        {t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <MainHeader>
        <Title>{t("campaignsConfig.title")}</Title>
      </MainHeader>
      <Paper variant="outlined" sx={mainPaperSx}>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography component="h3">{t("campaigns.config.interval")}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              {intervalSelect("messageInterval", t("campaigns.config.randomInterval"), RANDOM, "campaigns.config.noInterval")}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              {intervalSelect("longerIntervalAfter", t("campaigns.config.biggerInterval"), LONGER, "campaigns.config.notDefined")}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              {intervalSelect("greaterInterval", t("campaigns.config.greaterInterval"), LONGER, "campaigns.config.noInterval")}
            </Grid>
            <Grid size={12} sx={{ textAlign: "right" }}>
              <Button color="primary" sx={{ mr: 1 }} onClick={() => setShowForm(prev => !prev)}>
                {t("campaigns.config.addVariable")}
              </Button>
              <Button color="primary" variant="contained" onClick={save}>
                {t("campaigns.config.save")}
              </Button>
            </Grid>
            {showForm && (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("campaigns.config.shortcut")}
                    variant="outlined"
                    fullWidth
                    value={variable.key}
                    onChange={e => setVariable(prev => ({ ...prev, key: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("campaigns.config.content")}
                    variant="outlined"
                    fullWidth
                    value={variable.value}
                    onChange={e => setVariable(prev => ({ ...prev, value: e.target.value }))}
                  />
                </Grid>
                <Grid size={12} sx={{ textAlign: "right" }}>
                  <Button color="primary" sx={{ mr: 1 }} onClick={() => setShowForm(false)}>
                    {t("campaigns.config.close")}
                  </Button>
                  <Button color="primary" variant="contained" onClick={addVariable}>
                    {t("campaigns.config.add")}
                  </Button>
                </Grid>
              </>
            )}
            {settings.variables.length > 0 && (
              <Grid size={12}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: "1%" }} />
                      <TableCell>{t("campaigns.config.shortcut")}</TableCell>
                      <TableCell>{t("campaigns.config.content")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settings.variables.map(v => (
                      <TableRow key={v.key} data-testid="campaign-variable">
                        <TableCell>
                          <IconButton size="small" aria-label="remove variable" onClick={() => setRemoving(v.key)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </TableCell>
                        <TableCell>{`{${v.key}}`}</TableCell>
                        <TableCell>{v.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Grid>
            )}
          </Grid>
        </Box>
      </Paper>
    </MainContainer>
  );
}
