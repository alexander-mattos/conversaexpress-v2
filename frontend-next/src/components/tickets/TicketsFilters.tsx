"use client";

import { useEffect, useState } from "react";
import { Autocomplete, Box, Chip, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toastError";
import type { Tag } from "@/lib/tickets/types";

interface Option {
  id: number;
  name: string;
  color?: string;
}

function FilterAutocomplete({
  options,
  placeholder,
  chipColor,
  onFiltered,
  padding
}: {
  options: Option[];
  placeholder: string;
  chipColor: (option: Option) => string;
  onFiltered: (ids: number[]) => void;
  padding: string | number;
}) {
  const [selected, setSelected] = useState<Option[]>([]);
  return (
    <Box sx={{ p: padding }}>
      <Autocomplete
        multiple
        size="small"
        options={options}
        value={selected}
        onChange={(_, value) => {
          setSelected(value);
          onFiltered(value.map(o => o.id));
        }}
        getOptionLabel={option => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderValue={(value, getItemProps) =>
          value.map((option, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return (
              <Chip
                key={key}
                variant="outlined"
                size="small"
                label={option.name}
                sx={{ backgroundColor: chipColor(option), textShadow: "1px 1px 1px #000", color: "white" }}
                {...itemProps}
              />
            );
          })
        }
        renderInput={params => <TextField {...params} variant="outlined" placeholder={placeholder} />}
      />
    </Box>
  );
}

// Filtro por tags da aba de busca (GET /tags/list).
export function TagsFilter({ onFiltered }: { onFiltered: (ids: number[]) => void }) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  useEffect(() => {
    api
      .get<Tag[]>("/tags/list")
      .then(({ data }) => setTags(data))
      .catch(toastError);
  }, []);
  return (
    <FilterAutocomplete
      options={tags}
      placeholder={t("tickets.filters.tags")}
      chipColor={option => option.color || "#eee"}
      onFiltered={onFiltered}
      padding="10px"
    />
  );
}

// Filtro por usuários (só admin) da aba de busca (GET /users/list).
export function UsersFilter({ onFiltered }: { onFiltered: (ids: number[]) => void }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<Option[]>([]);
  useEffect(() => {
    api
      .get<Option[]>("/users/list")
      .then(({ data }) => setUsers(data.map(u => ({ id: u.id, name: u.name }))))
      .catch(toastError);
  }, []);
  return (
    <FilterAutocomplete
      options={users}
      placeholder={t("tickets.filters.user")}
      chipColor={() => "#bfbfbf"}
      onFiltered={onFiltered}
      padding="0px 10px 10px"
    />
  );
}
