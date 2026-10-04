import { createTheme, type Theme } from "@mui/material/styles";
import { enUS, esES, ptBR } from "@mui/material/locale";
import {
  paletteFor,
  scrollbarStyles,
  scrollbarStylesSoft,
  surfaceTokens,
  type ColorMode,
  type SurfaceTokens
} from "./tokens";

// Tokens extras disponíveis em theme.palette e no tema (tipados).
declare module "@mui/material/styles" {
  interface Palette extends SurfaceTokens {
    dark: Palette["primary"];
    light: Palette["primary"];
  }
  interface PaletteOptions extends Partial<SurfaceTokens> {
    dark?: PaletteOptions["primary"];
    light?: PaletteOptions["primary"];
  }
  interface Theme {
    scrollbarStyles: typeof scrollbarStyles;
    scrollbarStylesSoft: ReturnType<typeof scrollbarStylesSoft>;
  }
  interface ThemeOptions {
    scrollbarStyles?: typeof scrollbarStyles;
    scrollbarStylesSoft?: ReturnType<typeof scrollbarStylesSoft>;
  }
}

export type AppLanguage = "pt" | "en" | "es";

const LOCALES = { pt: ptBR, en: enUS, es: esES };

export const buildTheme = (mode: ColorMode, language: AppLanguage = "pt"): Theme =>
  createTheme(
    {
      palette: { ...paletteFor(mode), ...surfaceTokens(mode) },
      typography: { fontFamily: "var(--font-roboto), Roboto, Helvetica, Arial, sans-serif" },
      scrollbarStyles,
      scrollbarStylesSoft: scrollbarStylesSoft(mode),
      components: {
        // No v4 o Paper escuro não tinha o gradiente de elevação do MUI atual.
        MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
        // No v4 os links só eram sublinhados ao passar o mouse.
        MuiLink: { defaultProps: { underline: "hover" } }
      }
    },
    LOCALES[language]
  );
