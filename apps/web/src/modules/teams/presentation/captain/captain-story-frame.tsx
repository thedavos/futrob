import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import type {
  CompetitionEntryStatusDto,
  CompetitionTeamManagementDetailResponse,
} from "@futrob/api-contracts";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { teamManagementFixture } from "../competition-teams-view.fixtures.ts";
import type { CaptainTeamAccess } from "./captain-team-access.ts";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

export const captainStoryScope = {
  organizationId: "org-1",
  competitionId: "competition-1",
  teamId: "team-1",
} as const;

export const captainStoryAccess = {
  ready: { kind: "ready", scope: captainStoryScope },
  loading: { kind: "loading" },
  noTeam: { kind: "no-team" },
  forbidden: { kind: "forbidden", scope: captainStoryScope },
  unavailable: { kind: "unavailable" },
} satisfies Record<string, CaptainTeamAccess>;

export function captainDetailFixture(
  roster: Partial<CompetitionTeamManagementDetailResponse["roster"]> = {},
  entryStatus: CompetitionEntryStatusDto = "approved",
): CompetitionTeamManagementDetailResponse {
  const detail = teamManagementFixture(roster);
  return { ...detail, entry: { ...detail.entry, status: entryStatus } };
}

const StoryContent = createContext<ReactNode>(null);

function Slot() {
  return useContext(StoryContent);
}

/** Memory router + i18n so views can render router links without the app shell. */
export function CaptainStoryFrame({
  locale = "es",
  children,
}: Readonly<{ locale?: Locale; children: ReactNode }>) {
  // Built once: the page content flows in through context, so re-renders don't remount it.
  const [router] = useState(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const page = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Slot });
    return createRouter({
      routeTree: rootRoute.addChildren([page]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
  });
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyStyles(styles.frame)}>
        <StoryContent.Provider value={children}>
          <RouterProvider router={router} />
        </StoryContent.Provider>
      </div>
    </I18nProvider>
  );
}
