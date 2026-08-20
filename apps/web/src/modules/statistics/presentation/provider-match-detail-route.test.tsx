// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import type { GameDataProviderKeyQuery } from "@futrob/api-contracts";
import { describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { MatchSortOrder, PlayerMatchesView } from "./player-match-view.ts";
import { ProviderMatchDetailRoute } from "./provider-match-detail-route.tsx";

interface DetailQueryProps {
  readonly externalMatchId: string;
  readonly providerKey: GameDataProviderKeyQuery;
  readonly sort: MatchSortOrder;
  readonly view: PlayerMatchesView;
}

const detailQuery = vi.fn<(props: DetailQueryProps) => ReactNode>((_props) => (
  <div>backend detail query</div>
));

vi.mock("./provider-match-detail-query.tsx", () => ({
  ProviderMatchDetailQuery: (props: DetailQueryProps) => detailQuery(props),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children?: ReactNode }) => <a {...props}>{children}</a>,
}));

describe("ProviderMatchDetailRoute", () => {
  it("renders feature not-found for an invalid provider without mounting the query", () => {
    renderRoute("ea-leaked");

    expect(screen.getByText("Partido no encontrado")).toBeTruthy();
    expect(detailQuery).not.toHaveBeenCalled();
  });

  it("mounts the detail query for a supported provider", () => {
    renderRoute("ea-clubs");

    expect(screen.getByText("backend detail query")).toBeTruthy();
    expect(detailQuery).toHaveBeenCalledWith(
      expect.objectContaining({ externalMatchId: "match/7", providerKey: "ea-clubs" }),
    );
  });
});

function renderRoute(providerKey: string) {
  return render(
    <I18nProvider initialLocale="es">
      <ProviderMatchDetailRoute
        externalMatchId="match/7"
        providerKey={providerKey}
        sort="newest"
        view="all"
      />
    </I18nProvider>,
  );
}
