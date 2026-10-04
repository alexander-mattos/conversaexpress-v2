"use client";

import type { MouseEvent } from "react";
import { Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import OutlinedDiv from "./OutlinedDiv";

// Variáveis aceitas pelo backend nas mensagens ({{name}}, {{ms}}...).
export default function MessageVariablesPicker({ onClick, disabled }: { onClick: (value: string) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const vars = [
    { name: t("messageVariablesPicker.vars.contactFirstName"), value: "{{firstName}}" },
    { name: t("messageVariablesPicker.vars.contactName"), value: "{{name}} " },
    { name: t("messageVariablesPicker.vars.greeting"), value: "{{ms}} " },
    { name: t("messageVariablesPicker.vars.protocolNumber"), value: "{{protocol}} " },
    { name: t("messageVariablesPicker.vars.hour"), value: "{{hora}} " }
  ];
  const handleClick = (event: MouseEvent, value: string) => {
    event.preventDefault();
    if (!disabled) onClick(value);
  };
  return (
    <OutlinedDiv label={t("messageVariablesPicker.label")} disabled={disabled}>
      {vars.map(v => (
        <Chip key={v.value} onMouseDown={e => handleClick(e, v.value)} label={v.name} size="small" color="primary" sx={{ m: 0.5, cursor: "pointer" }} />
      ))}
    </OutlinedDiv>
  );
}
