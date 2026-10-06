// Cores da marca ConversaExpress. Valores idênticos aos de frontend/src/App.js
// (tema do frontend atual): alterar aqui muda a identidade visual.
export type ColorMode = "light" | "dark";

export const BRAND = {
  primary: "#aa30e1",
  scrollbar: "#6D30EF",
  // Secundária efetiva hoje: o padrão do Material-UI v4 (rosa A400). O MUI
  // atual usa outro padrão, então ela é fixada para não mudar o visual.
  secondary: "#f50057",
  whatsappTeal: "#128c7e",
  chat: {
    sentBubbleAccent: "#6bcbef",
    receivedBubbleAccent: "#35cd96",
    whatsappGreen: "#25d366"
  },
  chart: "#2DDD7F"
} as const;

const pick = (mode: ColorMode, light: string, dark: string): string =>
  mode === "light" ? light : dark;

// Tokens de superfície usados pelas telas (mesmos nomes do tema atual).
export const surfaceTokens = (mode: ColorMode) => ({
  textPrimary: pick(mode, BRAND.primary, "#FFFFFF"),
  borderPrimary: pick(mode, BRAND.primary, "#FFFFFF"),
  tabHeaderBackground: pick(mode, "#EEE", "#666"),
  optionsBackground: pick(mode, "#fafafa", "#333"),
  options: pick(mode, "#fafafa", "#666"),
  fontecor: pick(mode, BRAND.whatsappTeal, "#fff"),
  fancyBackground: pick(mode, "#fafafa", "#333"),
  bordabox: pick(mode, "#eee", "#333"),
  newmessagebox: pick(mode, "#eee", "#333"),
  inputdigita: pick(mode, "#fff", "#666"),
  contactdrawer: pick(mode, "#fff", "#666"),
  announcements: pick(mode, "#ededed", "#333"),
  login: pick(mode, "#fff", "#1C1C1C"),
  announcementspopover: pick(mode, "#fff", "#666"),
  chatlist: pick(mode, "#eee", "#666"),
  boxlist: pick(mode, "#ededed", "#666"),
  boxchatlist: pick(mode, "#ededed", "#333"),
  total: pick(mode, "#fff", "#222"),
  messageIcons: pick(mode, "grey", "#F3F3F3"),
  inputBackground: pick(mode, "#FFFFFF", "#333"),
  barraSuperior: pick(
    mode,
    `linear-gradient(to right, ${BRAND.primary}, ${BRAND.primary} , ${BRAND.primary})`,
    "#666"
  ),
  boxticket: pick(mode, "#EEE", "#666"),
  campaigntab: pick(mode, "#ededed", "#666"),
  mediainput: pick(mode, "#ededed", "#1c1c1c")
});

export type SurfaceTokens = ReturnType<typeof surfaceTokens>;

export const paletteFor = (mode: ColorMode) => ({
  mode,
  primary: { main: pick(mode, BRAND.primary, "#FFFFFF") },
  secondary: { main: BRAND.secondary },
  dark: { main: pick(mode, "#333333", "#F3F3F3") },
  light: { main: pick(mode, "#F3F3F3", "#333333") },
  // Fundos padrão do Material-UI v4 (o MUI atual usa outros tons no escuro).
  background: {
    default: pick(mode, "#fafafa", "#303030"),
    paper: pick(mode, "#fff", "#424242")
  }
});

export const scrollbarStyles = {
  "&::-webkit-scrollbar": { width: "8px", height: "8px" },
  "&::-webkit-scrollbar-thumb": {
    boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
    backgroundColor: BRAND.scrollbar
  }
} as const;

export const scrollbarStylesSoft = (mode: ColorMode) => ({
  "&::-webkit-scrollbar": { width: "8px" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: pick(mode, "#F3F3F3", "#333333")
  }
});
