"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AccountCircle from "@mui/icons-material/AccountCircle";
import CachedIcon from "@mui/icons-material/Cached";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LanguageMenu from "@/components/LanguageMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useThemeMode } from "@/contexts/ThemeModeContext";
import { socketManager } from "@/lib/socket";
import { toastError } from "@/lib/toastError";
import logo from "@/assets/logo.png";
import MainMenu from "./MainMenu";
import NotificationsPopOver from "./NotificationsPopOver";
import NotificationsVolume from "./NotificationsVolume";

const DRAWER_WIDTH = 240;
const USER_STATUS_INTERVAL = 1000 * 60 * 5;

const readVolume = (): number => {
  try {
    const saved = Number(window.localStorage.getItem("volume"));
    return Number.isFinite(saved) && window.localStorage.getItem("volume") !== null ? saved : 1;
  } catch {
    return 1;
  }
};

// Porta de frontend/src/layout/index.js: mesma barra, menu, cores e medidas.
export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { mode, toggleColorMode } = useThemeMode();
  const { user, handleLogout } = useAuth();
  const greaterThanSm = useMediaQuery(theme.breakpoints.up("sm"));
  const isPhone = useMediaQuery("(max-width:599.95px)", { noSsr: true });
  // A área logada só renderiza no navegador (depende da sessão), então o
  // estado inicial pode ler a tela e o localStorage diretamente.
  const [drawerOpen, setDrawerOpen] = useState(() => document.body.offsetWidth > 1200);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [volume, setVolume] = useState(readVolume);

  // Login em outro computador derruba esta sessão; "userStatus" mantém o
  // usuário como online (a cada 5 minutos, como hoje).
  const companyId = user?.companyId;
  const userId = user?.id;
  useEffect(() => {
    if (!companyId || !userId) return undefined;
    const socket = socketManager.getSocket(companyId, userId);
    const onAuth = (data: { user: { id: number } }) => {
      if (data.user.id === userId) {
        toastError("Sua conta foi acessada em outro computador.");
        setTimeout(() => handleLogout(), 1000);
      }
    };
    socket.on(`company-${companyId}-auth`, onAuth);
    socket.emit("userStatus");
    const interval = setInterval(() => socket.emit("userStatus"), USER_STATUS_INTERVAL);
    return () => {
      socket.off(`company-${companyId}-auth`, onAuth);
      clearInterval(interval);
    };
  }, [companyId, userId, handleLogout]);

  if (!user) return null;

  const closeOnPhone = () => {
    if (document.body.offsetWidth < 600) setDrawerOpen(false);
  };
  // Entre 600px e 960px o menu atual ocupava a tela inteira mesmo recolhido;
  // aqui ele usa as larguras normais (240px aberto, 72px recolhido).
  const drawerWidth = drawerOpen
    ? { xs: "100%", sm: `${DRAWER_WIDTH}px` }
    : { xs: theme.spacing(7), sm: theme.spacing(9) };
  const transition = (entering: boolean) =>
    theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: entering ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen
    });

  const dueDate = user.company?.dueDate;
  const greeting = (
    <>
      {t("mainDrawer.appBar.greeting.hello")} <b>{user.name}</b>, {t("mainDrawer.appBar.greeting.welcome")}{" "}
      <b>{user.company?.name}</b>!
      {greaterThanSm && user.profile === "admin" && dueDate
        ? ` (${t("mainDrawer.appBar.greeting.active")} ${format(new Date(dueDate), "dd/MM/yyyy")})`
        : null}
    </>
  );

  return (
    <Box
      sx={{
        display: "flex",
        height: { xs: "calc(100vh - 56px)", md: "100vh" },
        bgcolor: "fancyBackground",
        "& .MuiButton-outlined.MuiButton-colorPrimary": {
          color: "#FFF",
          backgroundColor: mode === "light" ? theme.palette.primary.main : "#1c1c1c"
        },
        "& .MuiTab-textColorPrimary.Mui-selected": mode === "dark" ? { color: "#FFF" } : {}
      }}
    >
      <Drawer
        variant={isPhone ? "temporary" : "permanent"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: isPhone ? undefined : drawerWidth,
          flexShrink: 0
        }}
        slotProps={{
          paper: {
            sx: {
              position: "relative",
              whiteSpace: "nowrap",
              overflowX: drawerOpen ? undefined : "hidden",
              width: drawerWidth,
              transition: transition(drawerOpen),
              ...theme.scrollbarStylesSoft
            }
          }
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1,
            minHeight: 48,
            height: { xs: 48, md: "auto" }
          }}
        >
          <Box
            component={Image}
            src={logo}
            alt="logo"
            priority
            sx={{
              width: { xs: "auto", md: "80%" },
              height: { xs: "80%", md: "auto" },
              maxWidth: 180
            }}
          />
          <IconButton onClick={() => setDrawerOpen(prev => !prev)} aria-label="close drawer">
            <ChevronLeftIcon />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ flex: 1, p: 1, overflowY: "scroll", ...theme.scrollbarStyles }}>
          <MainMenu collapsed={!drawerOpen} onNavigate={closeOnPhone} />
        </List>
        <Divider />
      </Drawer>

      <AppBar
        position="absolute"
        color="primary"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          transition: transition(drawerOpen),
          ...(drawerOpen && {
            ml: `${DRAWER_WIDTH}px`,
            width: `calc(100% - ${DRAWER_WIDTH}px)`,
            display: { xs: "none", sm: "flex" }
          })
        }}
      >
        <Toolbar variant="dense" sx={{ pr: "24px", color: "dark.main", background: theme.palette.barraSuperior }}>
          <IconButton
            edge="start"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(prev => !prev)}
            sx={{ mr: "36px", display: drawerOpen ? "none" : undefined }}
          >
            <MenuIcon />
          </IconButton>

          <Typography component="h2" variant="h6" color="inherit" noWrap sx={{ flexGrow: 1, fontSize: 14, color: "white" }}>
            {greeting}
          </Typography>

          <LanguageMenu />

          <IconButton edge="start" onClick={toggleColorMode} aria-label="toggle theme">
            {mode === "dark" ? <Brightness7Icon sx={{ color: "white" }} /> : <Brightness4Icon sx={{ color: "white" }} />}
          </IconButton>

          <NotificationsVolume volume={volume} setVolume={setVolume} />

          <IconButton onClick={() => window.location.reload()} aria-label={t("mainDrawer.appBar.refresh")} color="inherit">
            <CachedIcon sx={{ color: "white" }} />
          </IconButton>

          <NotificationsPopOver volume={volume} />

          <IconButton
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={(e: MouseEvent<HTMLElement>) => setAccountAnchor(e.currentTarget)}
            sx={{ color: "white" }}
          >
            <AccountCircle />
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={accountAnchor}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            open={!!accountAnchor}
            onClose={() => setAccountAnchor(null)}
          >
            <MenuItem
              onClick={() => {
                setAccountAnchor(null);
                handleLogout();
              }}
            >
              {t("mainDrawer.appBar.user.logout")}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, overflow: "auto" }}>
        <Box sx={{ minHeight: 48 }} />
        {children}
      </Box>
    </Box>
  );
}
