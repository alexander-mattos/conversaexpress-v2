"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography
} from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@mui/icons-material/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import EventIcon from "@mui/icons-material/Event";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PeopleIcon from "@mui/icons-material/People";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AnnouncementIcon from "@mui/icons-material/Announcement";
import ForumIcon from "@mui/icons-material/Forum";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import TableChartIcon from "@mui/icons-material/TableChart";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeviceHubOutlinedIcon from "@mui/icons-material/DeviceHubOutlined";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/lib/rules";
import { useConnectionWarning, useUnreadChats, useVersion } from "@/hooks/useMenuStatus";
import { usePlan } from "@/contexts/PlanContext";

function MenuLink({ to, primary, icon }: { to: string; primary: string; icon: ReactNode }) {
  return (
    <li>
      <ListItemButton dense component={Link} href={to}>
        <ListItemIcon>{icon}</ListItemIcon>
        <ListItemText primary={primary} />
      </ListItemButton>
    </li>
  );
}

// Mesmos itens, ordem, ícones e regras de exibição de frontend/src/layout/MainListItems.js.
export default function MainMenu({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { t } = useTranslation();
  const { user, campaignsEnabled } = useAuth();
  const plan = usePlan().flags;
  const isAdmin = can(user?.profile, "drawer-admin-items:view");
  const connectionWarning = useConnectionWarning(user, isAdmin);
  const hasUnreadChats = useUnreadChats(user);
  const version = useVersion();
  const [campaignsOpen, setCampaignsOpen] = useState(false);

  if (!user) return null;

  return (
    <div onClick={onNavigate}>
      {can(user.profile, "dashboard:view") && (
        <MenuLink to="/" primary="Dashboard" icon={<DashboardOutlinedIcon />} />
      )}
      <MenuLink to="/tickets" primary={t("mainDrawer.listItems.tickets")} icon={<WhatsAppIcon />} />
      {plan.useKanban && <MenuLink to="/kanban" primary="Kanban" icon={<TableChartIcon />} />}
      <MenuLink to="/quick-messages" primary={t("mainDrawer.listItems.quickMessages")} icon={<FlashOnIcon />} />
      <MenuLink to="/todolist" primary={t("mainDrawer.listItems.tasks")} icon={<BorderColorIcon />} />
      <MenuLink to="/contacts" primary={t("mainDrawer.listItems.contacts")} icon={<ContactPhoneOutlinedIcon />} />
      <MenuLink to="/schedules" primary={t("mainDrawer.listItems.schedules")} icon={<EventIcon />} />
      <MenuLink to="/tags" primary={t("mainDrawer.listItems.tags")} icon={<LocalOfferIcon />} />
      <MenuLink
        to="/chats"
        primary={t("mainDrawer.listItems.chats")}
        icon={
          <Badge color="secondary" variant="dot" invisible={!hasUnreadChats}>
            <ForumIcon />
          </Badge>
        }
      />
      <MenuLink to="/helps" primary={t("mainDrawer.listItems.helps")} icon={<HelpOutlineIcon />} />

      {isAdmin && (
        <>
          <Divider />
          {!collapsed && (
            <ListSubheader
              inset
              color="inherit"
              sx={{ position: "relative", fontSize: "17px", textAlign: "left", pl: "20px", bgcolor: "transparent" }}
            >
              {t("mainDrawer.listItems.administration")}
            </ListSubheader>
          )}

          {(plan.useCampaigns || campaignsEnabled) && (
            <>
              <ListItemButton
                onClick={event => {
                  // Abrir o submenu não fecha o menu no celular.
                  event.stopPropagation();
                  setCampaignsOpen(prev => !prev);
                }}
              >
                <ListItemIcon>
                  <EventAvailableIcon />
                </ListItemIcon>
                <ListItemText primary={t("mainDrawer.listItems.campaigns")} />
                {campaignsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse sx={{ pl: "15px" }} in={campaignsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <MenuLink to="/campaigns" primary="Listagem" icon={<ListAltIcon />} />
                  <MenuLink to="/contact-lists" primary="Listas de Contatos" icon={<PeopleIcon />} />
                  <MenuLink to="/campaigns-config" primary="Configurações" icon={<SettingsOutlinedIcon />} />
                </List>
              </Collapse>
            </>
          )}
          {user.super && (
            <MenuLink to="/announcements" primary={t("mainDrawer.listItems.annoucements")} icon={<AnnouncementIcon />} />
          )}
          {plan.useOpenAi && (
            <MenuLink to="/prompts" primary={t("mainDrawer.listItems.prompts")} icon={<AllInclusiveIcon />} />
          )}
          {plan.useIntegrations && (
            <MenuLink
              to="/queue-integration"
              primary={t("mainDrawer.listItems.queueIntegration")}
              icon={<DeviceHubOutlinedIcon />}
            />
          )}
          <MenuLink
            to="/connections"
            primary={t("mainDrawer.listItems.connections")}
            icon={
              <Badge badgeContent={connectionWarning ? "!" : 0} color="error">
                <SyncAltIcon />
              </Badge>
            }
          />
          <MenuLink to="/files" primary={t("mainDrawer.listItems.files")} icon={<AttachFileIcon />} />
          <MenuLink to="/queues" primary={t("mainDrawer.listItems.queues")} icon={<AccountTreeOutlinedIcon />} />
          <MenuLink to="/users" primary={t("mainDrawer.listItems.users")} icon={<PeopleAltOutlinedIcon />} />
          {plan.useExternalApi && (
            <MenuLink to="/messages-api" primary={t("mainDrawer.listItems.messagesAPI")} icon={<CodeRoundedIcon />} />
          )}
          <MenuLink to="/financeiro" primary={t("mainDrawer.listItems.financeiro")} icon={<LocalAtmIcon />} />
          <MenuLink to="/settings" primary={t("mainDrawer.listItems.settings")} icon={<SettingsOutlinedIcon />} />

          {!collapsed && (
            <>
              <Divider />
              <Typography sx={{ fontSize: "12px", p: "10px", textAlign: "right", fontWeight: "bold" }}>
                {version}
              </Typography>
            </>
          )}
        </>
      )}
    </div>
  );
}
