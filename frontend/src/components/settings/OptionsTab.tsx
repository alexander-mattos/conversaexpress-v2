"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Box, FormControl, FormHelperText, Grid, InputLabel, MenuItem, Select, Tab, Tabs, TextField, Typography } from "@mui/material";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import {
  INTEGRATIONS,
  OPTIONS,
  isConfigured,
  looksLikeExternalUrl,
  settingValue,
  type IntegrationField,
  type SettingRow
} from "@/lib/settings/settings";

// Porta de frontend/src/components/Settings/Options. Cada opção salva ao
// trocar; as credenciais das integrações são só de escrita (em branco mantém).
export default function OptionsTab({ settings, onChange }: { settings: SettingRow[]; onChange: (setting: SettingRow) => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState<string | null>(null);
  const [integrationTab, setIntegrationTab] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const save = async (key: string, value: string) => {
    setSaving(key);
    try {
      const { data } = await api.put<SettingRow>(`/settings/${key}`, { value });
      onChange(data);
      toast.success(t("settings.options.toasts.success"));
      return true;
    } catch (err) {
      toastError(err);
      return false;
    } finally {
      setSaving(null);
    }
  };

  const draftOf = (field: IntegrationField) => drafts[field.key] ?? (field.secret ? "" : settingValue(settings, field.key));

  const saveField = async (field: IntegrationField) => {
    const value = draftOf(field).trim();
    if (field.secret && value === "") return;
    if (!field.secret && value === settingValue(settings, field.key)) return;
    if (!field.secret && !looksLikeExternalUrl(value)) {
      toast.error(t("settings.integrations.invalidUrl"));
      return;
    }
    if (await save(field.key, value)) {
      setDrafts(prev => {
        const next = { ...prev };
        delete next[field.key];
        return next;
      });
    }
  };

  const fieldHelper = (field: IntegrationField) => {
    if (field.secret) return isConfigured(settings, field.key) ? t("settings.integrations.configured") : t("settings.integrations.notConfigured");
    return looksLikeExternalUrl(draftOf(field)) ? " " : t("settings.integrations.invalidUrl");
  };

  const integration = INTEGRATIONS[integrationTab];

  return (
    <Box>
      <Grid container spacing={3}>
        {OPTIONS.map(option => (
          <Grid key={option.key} size={{ xs: 12, md: 6, lg: 4 }}>
            <FormControl fullWidth>
              <InputLabel id={`${option.key}-label`}>{t(option.title)}</InputLabel>
              <Select
                labelId={`${option.key}-label`}
                label={t(option.title)}
                value={settingValue(settings, option.key) || option.options[0].value}
                onChange={e => save(option.key, String(e.target.value))}
                data-testid={`setting-${option.key}`}
              >
                {option.options.map(item => (
                  <MenuItem key={item.value} value={item.value}>
                    {t(item.label)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{saving === option.key ? t("settings.options.updating") : " "}</FormHelperText>
            </FormControl>
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>
        {t("settings.options.tabs.integrations")}
      </Typography>
      <Tabs value={integrationTab} onChange={(_, value: number) => setIntegrationTab(value)} variant="scrollable">
        {INTEGRATIONS.map(item => (
          <Tab key={item.title} label={item.title} />
        ))}
      </Tabs>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {integration.fields.map(field => (
          <Grid key={field.key} size={{ xs: 12, md: 6, lg: 4 }}>
            <TextField
              fullWidth
              label={t(field.label)}
              type={field.secret ? "password" : "text"}
              autoComplete="off"
              placeholder={field.secret && isConfigured(settings, field.key) ? "••••••••" : undefined}
              value={draftOf(field)}
              onChange={e => setDrafts(prev => ({ ...prev, [field.key]: e.target.value }))}
              onBlur={() => saveField(field)}
              onKeyDown={e => e.key === "Enter" && saveField(field)}
              error={!field.secret && !looksLikeExternalUrl(draftOf(field))}
              helperText={saving === field.key ? t("settings.options.updating") : fieldHelper(field)}
              slotProps={{ htmlInput: { "data-testid": `setting-${field.key}` } }}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
