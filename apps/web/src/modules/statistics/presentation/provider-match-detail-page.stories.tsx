import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  recentProviderMatchDetailFixture,
  recentProviderMatchFixture,
} from "./player-matches-page.fixtures.ts";
import {
  ProviderMatchDetailView,
  type ProviderMatchDetailViewState,
} from "./provider-match-detail-page.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: {
      default: "1.25rem",
      [media.lg]: "2.5rem",
    },
    paddingBlock: "1.5rem",
  },
});

const detail = recentProviderMatchDetailFixture({
  home: { externalClubId: "10754", name: "Fera Enjaulada", goals: 3, imageUrl: null },
  away: { externalClubId: "99", name: "Night Owls", goals: 2, imageUrl: null },
  players: [
    player("davos282", "10754", 8.4, { goals: 3, isMvp: true }),
    player("Central Fera", "10754", 7.6, { position: "CB", tacklesMade: 5, assists: 2 }),
    player("Portero Fera", "10754", null, { position: "GK", saves: 4 }),
    player("Night Ten", "99", 8.1, { goals: 2 }),
    player("Night Keeper", "99", 6.7, { position: "GK", saves: 6 }),
  ],
  appearance: {
    externalPlayerId: "davos282",
    externalClubId: "10754",
    displayName: "davos282",
    goals: 3,
    rating: 8.4,
  },
  metadata: { completeness: "partial" },
});
const summary = recentProviderMatchFixture({
  home: detail.match.home,
  away: detail.match.away,
  appearance: detail.kind === "played" ? detail.appearance : undefined,
  metadata: detail.match.metadata,
});

type Scenario =
  | "ready"
  | "notPlayed"
  | "loading"
  | "loadingPlaceholder"
  | "needsClub"
  | "needsGameAccount"
  | "notFound"
  | "error";

type StoryArgs = { readonly scenario: Scenario };

function stateForScenario(scenario: Scenario): ProviderMatchDetailViewState {
  switch (scenario) {
    case "ready":
      return { kind: "ready", detail };
    case "notPlayed":
      return { kind: "ready", detail: recentProviderMatchDetailFixture({ kind: "not_played" }) };
    case "loading":
      return { kind: "loading" };
    case "loadingPlaceholder":
      return { kind: "loading", summary };
    case "needsClub":
      return { kind: "needs_club" };
    case "needsGameAccount":
      return { kind: "needs_game_account" };
    case "notFound":
      return { kind: "not_found" };
    case "error":
      return { kind: "error", retry: () => undefined };
    default: {
      const _exhaustive: never = scenario;
      return _exhaustive;
    }
  }
}

function DetailStory({ scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const detailRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/matches/$providerKey/$externalMatchId",
      component: () => (
        <ProviderMatchDetailView sort="newest" state={stateForScenario(scenario)} view="all" />
      ),
    });
    const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player/matches",
      component: () => <p>Mis partidos</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([detailRoute, listRoute]),
      history: createMemoryHistory({
        initialEntries: ["/player/matches/ea-clubs/ea-1?view=all&sort=newest"],
      }),
    });
  }, [scenario]);
  return (
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Player/Match detail",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready" },
  argTypes: {
    scenario: {
      control: "select",
      options: [
        "ready",
        "notPlayed",
        "loading",
        "loadingPlaceholder",
        "needsClub",
        "needsGameAccount",
        "notFound",
        "error",
      ],
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => <DetailStory key={args.scenario} {...args} />,
};

export const Ready: Story = {
  args: { scenario: "ready" },
  parameters: { a11y: { test: "error" } },
  render: (args) => <DetailStory {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Fera Enjaulada vs Night Owls" }),
    ).toBeVisible();
    await expect(canvas.getByRole("navigation", { name: "Migas de pan" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Mis partidos" })).toBeVisible();
    await expect(canvas.getByRole("tab", { name: "Resumen" })).toBeVisible();
    await expect(canvasElement.querySelector("[data-match-status='finalized']")).toHaveTextContent(
      "Finalizado",
    );
    await expect(canvas.getByText("Comparación de equipos")).toBeVisible();
    await expect(canvas.getByText("Tu rendimiento")).toBeVisible();
    await expect(canvas.getByText("Destacados del partido")).toBeVisible();
    await expect(canvas.getAllByText("davos282")[0]).toBeVisible();
  },
};

export const NotPlayed: Story = {
  args: { scenario: "notPlayed" },
  render: (args) => <DetailStory {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No jugaste")).toBeVisible();
    await expect(canvas.queryByText("Tu rendimiento")).toBeNull();
    await expect(canvas.getByText("Destacados del partido")).toBeVisible();
  },
};

export const Loading: Story = {
  args: { scenario: "loading" },
  render: (args) => <DetailStory {...args} />,
};

export const LoadingWithListPlaceholder: Story = {
  args: { scenario: "loadingPlaceholder" },
  render: (args) => <DetailStory {...args} />,
};

export const NeedsClub: Story = {
  args: { scenario: "needsClub" },
  render: (args) => <DetailStory {...args} />,
};

export const NeedsGameAccount: Story = {
  args: { scenario: "needsGameAccount" },
  render: (args) => <DetailStory {...args} />,
};

export const NotFound: Story = {
  args: { scenario: "notFound" },
  render: (args) => <DetailStory {...args} />,
};

export const ErrorState: Story = {
  args: { scenario: "error" },
  render: (args) => <DetailStory {...args} />,
};

export const Mobile: Story = {
  args: { scenario: "ready" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <DetailStory {...args} />,
};

function player(
  displayName: string,
  externalClubId: string,
  rating: number | null,
  overrides: Partial<ReturnType<typeof basePlayer>> = {},
) {
  return {
    ...basePlayer(),
    externalPlayerId: displayName.toLowerCase().replaceAll(" ", "-"),
    displayName,
    externalClubId,
    rating,
    ...overrides,
  };
}

function basePlayer() {
  return {
    externalPlayerId: "player",
    displayName: "Player",
    externalClubId: "10754",
    position: "CM",
    minutesPlayed: 90,
    goals: 0,
    assists: 0,
    shots: 0,
    passAttempts: 12,
    passesMade: 10,
    tackleAttempts: 2,
    tacklesMade: 1,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    isMvp: false,
    rating: 7,
  };
}
