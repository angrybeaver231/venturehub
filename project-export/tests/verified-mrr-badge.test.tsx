import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { VerifiedMrrBadge } from "@/components/verified-mrr-badge";
import type { VerifiedMrr } from "@shared/schema";

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <LanguageProvider>
        <TooltipProvider>{ui}</TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

const verified: VerifiedMrr = {
  startupId: "s-verified",
  mrrMinor: 250_000,
  arrMinor: 3_000_000,
  revenueMinor: 800_000,
  revenueLast30dMinor: 800_000,
  burnLast30dMinor: 0,
  runwayMonths: null,
  currency: "RUB",
  sourceKey: "fin-yookassa",
  sourceLabel: "ЮKassa",
  capturedAt: new Date().toISOString(),
  isVerified: true,
  hasLiveConnector: true,
};

const unverified: VerifiedMrr = { ...verified, startupId: "s-unverified", isVerified: false };

describe("<VerifiedMrrBadge>", () => {
  it("renders the gold badge for a verified startup", () => {
    render(wrap(<VerifiedMrrBadge startupId="s-verified" data={verified} />));
    const badge = screen.getByTestId("badge-verified-mrr-s-verified");
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/MRR/);
    expect(badge.textContent).toMatch(/2\.5k|2,500/);
  });

  it("renders nothing when the startup is not verified", () => {
    const { container } = render(
      wrap(<VerifiedMrrBadge startupId="s-unverified" data={unverified} />),
    );
    expect(screen.queryByTestId("badge-verified-mrr-s-unverified")).toBeNull();
    expect(container.querySelector("[data-testid^='badge-verified-mrr']")).toBeNull();
  });
});
