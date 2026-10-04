"use client";

import { useState, type MouseEvent } from "react";
import { FormControlLabel, IconButton, Menu, MenuItem, Radio, RadioGroup } from "@mui/material";
import LanguageOutlined from "@mui/icons-material/LanguageOutlined";
import { useTranslation } from "react-i18next";
import { changeLanguage, type Language } from "@/i18n";
import { api, getAccessToken } from "@/lib/api";

// Seletor de idioma (equivalente ao LanguageControl do frontend atual).
export default function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const handleChange = async (language: Language) => {
    changeLanguage(language);
    if (getAccessToken()) {
      try {
        await api.post(`/users/set-language/${language}`);
      } catch {
        // idioma da empresa é só uma preferência; a troca local já valeu
      }
    }
  };

  return (
    <>
      <IconButton
        edge="start"
        aria-label={t("selectLanguage")}
        onClick={(e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)}
        sx={{ color: "white", mr: 1 }}
      >
        <LanguageOutlined />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disableRipple>
          <div>
            <label>{t("selectLanguage")}</label>
            <RadioGroup
              row
              value={i18n.language?.substring(0, 2)}
              onChange={e => handleChange(e.target.value as Language)}
            >
              <FormControlLabel value="pt" control={<Radio />} label="Português (BR)" />
              <FormControlLabel value="en" control={<Radio />} label="English" />
              <FormControlLabel value="es" control={<Radio />} label="Español" />
            </RadioGroup>
          </div>
        </MenuItem>
      </Menu>
    </>
  );
}
