import { formatTime } from "@/lib/formatTime";

describe("formatTime", () => {
  it("formata minutos como no dashboard atual", () => {
    expect(formatTime(0)).toBe("00h 00m");
    expect(formatTime(undefined)).toBe("00h 00m");
    expect(formatTime(75.9)).toBe("01h 15m");
    expect(formatTime("125")).toBe("02h 05m");
    expect(formatTime(1500)).toBe("01h 00m");
  });
});
