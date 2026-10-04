"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Badge, Box, Button, FormControlLabel, InputBase, Paper, Switch, Tab, Tabs } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/rules";
import type { Ticket } from "@/lib/tickets/types";
import NewTicketModal from "./NewTicketModal";
import TicketsList from "./TicketsList";
import TicketsQueueSelect from "./TicketsQueueSelect";
import { TagsFilter, UsersFilter } from "./TicketsFilters";

const wrapperSx = {
  position: "relative",
  display: "flex",
  height: "100%",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: 0
} as const;

const tabSx = { minWidth: 120, width: 120 };
const HIDDEN: CSSProperties = { width: 0, height: 0 };

type MainTab = "open" | "closed" | "search";
type OpenTab = "open" | "pending";

// Porta de frontend/src/components/TicketsManagerTabs.
export default function TicketsManagerTabs({ onSelect }: { onSelect?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.profile.toUpperCase() === "ADMIN";

  const [tab, setTab] = useState<MainTab>("open");
  const [tabOpen, setTabOpen] = useState<OpenTab>("open");
  const [searchParam, setSearchParam] = useState("");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  // Admin começa vendo todos, como hoje.
  const [showAllTickets, setShowAllTickets] = useState(isAdmin);
  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>(() => user?.queues.map(q => q.id) ?? []);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (tab === "search") searchInputRef.current?.focus();
  }, [tab]);

  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    clearTimeout(searchTimeout.current);
    if (term === "") {
      setSearchParam("");
      setTab("open");
      return;
    }
    searchTimeout.current = setTimeout(() => setSearchParam(term), 500);
  };

  const handleNewTicketClose = (ticket?: Ticket) => {
    setNewTicketModalOpen(false);
    if (ticket?.uuid) router.push(`/tickets/${ticket.uuid}`);
  };

  const updateOpenCount = useCallback((count: number) => setOpenCount(count), []);
  const updatePendingCount = useCallback((count: number) => setPendingCount(count), []);

  if (!user) return null;

  // Cada mudança de filtro recria a lista correspondente (página 1).
  const queuesKey = selectedQueueIds.join(",");

  return (
    <Paper elevation={0} variant="outlined" sx={wrapperSx}>
      <NewTicketModal open={newTicketModalOpen} onClose={handleNewTicketClose} />
      <Paper elevation={0} square sx={{ flex: "none", bgcolor: "tabHeaderBackground" }}>
        <Tabs value={tab} onChange={(_, value: MainTab) => setTab(value)} variant="fullWidth" indicatorColor="primary" textColor="primary">
          <Tab value="open" icon={<MoveToInboxIcon />} label={t("tickets.tabs.open.title")} sx={tabSx} />
          <Tab value="closed" icon={<CheckBoxIcon />} label={t("tickets.tabs.closed.title")} sx={tabSx} />
          <Tab value="search" icon={<SearchIcon />} label={t("tickets.tabs.search.title")} sx={tabSx} />
        </Tabs>
      </Paper>
      <Paper
        square
        elevation={0}
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "optionsBackground", p: 1 }}
      >
        {tab === "search" ? (
          <Box sx={{ flex: 1, bgcolor: "total", display: "flex", borderRadius: "40px", p: "4px", mr: 1 }}>
            <SearchIcon sx={{ color: "grey", ml: "6px", mr: "6px", alignSelf: "center" }} />
            <InputBase
              sx={{ flex: 1, border: "none", borderRadius: "30px" }}
              inputRef={searchInputRef}
              placeholder={t("tickets.search.placeholder")}
              type="search"
              onChange={handleSearch}
            />
          </Box>
        ) : (
          <>
            <Button variant="outlined" color="primary" onClick={() => setNewTicketModalOpen(true)}>
              {t("ticketsManager.buttons.newTicket")}
            </Button>
            {can(user.profile, "tickets-manager:showall") && (
              <FormControlLabel
                label={t("tickets.buttons.showAll")}
                labelPlacement="start"
                control={
                  <Switch
                    size="small"
                    checked={showAllTickets}
                    onChange={() => setShowAllTickets(prev => !prev)}
                    name="showAllTickets"
                    color="primary"
                  />
                }
              />
            )}
          </>
        )}
        <TicketsQueueSelect userQueues={user.queues} selectedQueueIds={selectedQueueIds} onChange={setSelectedQueueIds} />
      </Paper>

      {tab === "open" && (
        <Box sx={wrapperSx}>
          <Tabs value={tabOpen} onChange={(_, value: OpenTab) => setTabOpen(value)} indicatorColor="primary" textColor="primary" variant="fullWidth">
            <Tab
              value="open"
              label={
                <Badge badgeContent={openCount} color="primary">
                  {t("ticketsList.assignedHeader")}
                </Badge>
              }
            />
            <Tab
              value="pending"
              label={
                <Badge badgeContent={pendingCount} color="secondary">
                  {t("ticketsList.pendingHeader")}
                </Badge>
              }
            />
          </Tabs>
          <Paper sx={wrapperSx}>
            <TicketsList
              key={`open-${showAllTickets}-${queuesKey}`}
              status="open"
              showAll={showAllTickets}
              selectedQueueIds={selectedQueueIds}
              updateCount={updateOpenCount}
              style={tabOpen !== "open" ? HIDDEN : undefined}
              onSelect={onSelect}
            />
            <TicketsList
              key={`pending-${queuesKey}`}
              status="pending"
              selectedQueueIds={selectedQueueIds}
              updateCount={updatePendingCount}
              style={tabOpen !== "pending" ? HIDDEN : undefined}
              onSelect={onSelect}
            />
          </Paper>
        </Box>
      )}
      {tab === "closed" && (
        <Box sx={wrapperSx}>
          <TicketsList key={`closed-${queuesKey}`} status="closed" showAll selectedQueueIds={selectedQueueIds} onSelect={onSelect} />
        </Box>
      )}
      {tab === "search" && (
        <Box sx={wrapperSx}>
          <TagsFilter onFiltered={setSelectedTags} />
          {user.profile === "admin" && <UsersFilter onFiltered={setSelectedUsers} />}
          <TicketsList
            key={`search-${searchParam}-${selectedTags.join(",")}-${selectedUsers.join(",")}-${queuesKey}`}
            searchParam={searchParam}
            showAll
            tags={selectedTags}
            users={selectedUsers}
            selectedQueueIds={selectedQueueIds}
            onSelect={onSelect}
          />
        </Box>
      )}
    </Paper>
  );
}
