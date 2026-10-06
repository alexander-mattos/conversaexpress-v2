import { buildTheme } from "@/theme/theme";
import { BRAND, scrollbarStyles, surfaceTokens } from "@/theme/tokens";

// As cores abaixo são as do frontend atual (frontend/src/App.js). Se este
// teste falhar, a identidade visual da marca ConversaExpress mudou.
describe("tema ConversaExpress", () => {
  it("mantém as cores da marca", () => {
    expect(BRAND).toEqual({
      primary: "#aa30e1",
      scrollbar: "#6D30EF",
      secondary: "#f50057",
      whatsappTeal: "#128c7e",
      chat: { sentBubbleAccent: "#6bcbef", receivedBubbleAccent: "#35cd96", whatsappGreen: "#25d366" },
      chart: "#2DDD7F"
    });
    expect(scrollbarStyles["&::-webkit-scrollbar-thumb"].backgroundColor).toBe("#6D30EF");
  });

  it("modo claro", () => {
    const theme = buildTheme("light");
    expect(theme.palette.primary.main).toBe("#aa30e1");
    expect(theme.palette.secondary.main).toBe("#f50057");
    expect(theme.palette.barraSuperior).toBe("linear-gradient(to right, #aa30e1, #aa30e1 , #aa30e1)");
    expect(theme.palette.fontecor).toBe("#128c7e");
    expect(theme.palette.background.paper).toBe("#fff");
  });

  it("modo escuro", () => {
    const theme = buildTheme("dark");
    expect(theme.palette.mode).toBe("dark");
    expect(theme.palette.primary.main).toBe("#FFFFFF");
    expect(theme.palette.barraSuperior).toBe("#666");
    expect(theme.palette.background.paper).toBe("#424242");
    expect(theme.palette.background.default).toBe("#303030");
  });

  it("tokens de superfície (claro e escuro)", () => {
    expect(surfaceTokens("light")).toMatchSnapshot();
    expect(surfaceTokens("dark")).toMatchSnapshot();
  });
});
