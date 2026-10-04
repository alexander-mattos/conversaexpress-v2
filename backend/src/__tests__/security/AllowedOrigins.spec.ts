import { getAllowedOrigins } from "../../helpers/AllowedOrigins";

describe("getAllowedOrigins", () => {
  it("usa só o FRONTEND_URL quando não há origens extras", () => {
    expect(getAllowedOrigins({ FRONTEND_URL: "https://app.exemplo.com" })).toEqual(["https://app.exemplo.com"]);
  });

  it("inclui as origens extras, sem barra final, vazios ou repetidas", () => {
    expect(
      getAllowedOrigins({
        FRONTEND_URL: "https://app.exemplo.com/",
        FRONTEND_EXTRA_ORIGINS: " https://novo.exemplo.com ,,https://app.exemplo.com"
      })
    ).toEqual(["https://app.exemplo.com", "https://novo.exemplo.com"]);
  });

  it("sem configuração não libera nenhuma origem", () => {
    expect(getAllowedOrigins({})).toEqual([]);
  });
});
