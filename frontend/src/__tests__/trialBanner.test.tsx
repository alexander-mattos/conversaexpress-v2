import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trialInfo } from "@/lib/billing/trial";

let user: Record<string, unknown> | null = null;
const handlers: Record<string, () => void> = {};
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/lib/socket", () => ({
  socketManager: { getSocket: () => ({ on: (e: string, h: () => void) => (handlers[e] = h), off: vi.fn() }) }
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) })
}));

import TrialBanner from "@/components/layout/TrialBanner";

const now = new Date(2026, 9, 7, 9, 0);
const admin = (dueDate: Date, extra: Record<string, unknown> = {}) => ({
  id: 1,
  companyId: 7,
  profile: "admin",
  super: false,
  company: { id: 7, name: "X", dueDate: dueDate.toISOString(), trial: true },
  ...extra
});

describe("trialInfo", () => {
  it("só admin, em teste e antes do vencimento", () => {
    expect(trialInfo(admin(new Date(2026, 9, 10, 9)), now)).toMatchObject({ days: 3, lastDay: false });
    expect(trialInfo(admin(new Date(2026, 9, 7, 18)), now)).toMatchObject({ days: 0, lastDay: true });
    expect(trialInfo(admin(new Date(2026, 9, 7, 8)), now)).toBeNull();
    expect(trialInfo({ ...admin(new Date(2026, 9, 10)), profile: "user" }, now)).toBeNull();
    expect(trialInfo({ ...admin(new Date(2026, 9, 10)), super: true }, now)).toBeNull();
    const paid = admin(new Date(2026, 9, 10));
    expect(trialInfo({ ...paid, company: { ...paid.company, trial: false } }, now)).toBeNull();
  });
});

describe("TrialBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    sessionStorage.clear();
  });

  it("aviso amarelo com X; fechar some e fica fechado nesta sessão", () => {
    user = admin(new Date(2026, 9, 10, 9));
    const { unmount } = render(<TrialBanner />);
    const banner = screen.getByTestId("trial-banner");
    expect(banner).toHaveAttribute("data-lastday", "false");
    expect(banner.textContent).toContain('"count":3');
    expect(screen.queryByTestId("trial-banner-pay")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByTestId("trial-banner")).toBeNull();
    unmount();
    render(<TrialBanner />);
    expect(screen.queryByTestId("trial-banner")).toBeNull();
  });

  it("último dia: vermelho, sem X, com link para o Financeiro, mesmo se fechado antes", () => {
    sessionStorage.setItem("trialBannerDismissed", "1");
    user = admin(new Date(2026, 9, 7, 18));
    render(<TrialBanner />);
    expect(screen.getByTestId("trial-banner")).toHaveAttribute("data-lastday", "true");
    expect(screen.getByTestId("trial-banner-pay")).toHaveAttribute("href", "/financeiro");
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
  });

  it("some quando o pagamento é confirmado", () => {
    user = admin(new Date(2026, 9, 7, 18));
    render(<TrialBanner />);
    act(() => handlers["company-7-payment"]());
    expect(screen.queryByTestId("trial-banner")).toBeNull();
  });
});
