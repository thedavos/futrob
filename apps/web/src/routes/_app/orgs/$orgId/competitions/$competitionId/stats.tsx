import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  DEFAULT_TEAM_STATS_SORT,
  DEFAULT_TEAM_STATS_VIEW,
  TEAM_STATS_SORT_COLUMNS,
  TEAM_STATS_VIEWS,
} from "@/modules/statistics/presentation/competition-team-stats/competition-team-stats-model.ts";
import { CompetitionTeamStatsRoute } from "@/modules/statistics/presentation/competition-team-stats/competition-team-stats-page.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

const searchSchema = z.object({
  view: z.enum(TEAM_STATS_VIEWS).optional().catch(undefined),
  sort: z.enum(TEAM_STATS_SORT_COLUMNS).optional().catch(undefined),
  order: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/stats")({
  validateSearch: searchSchema,
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "competition.teamStats.documentTitle"),
  component: CompetitionStatsPage,
});

function CompetitionStatsPage() {
  const { orgId, competitionId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const sort = search.sort
    ? { column: search.sort, direction: search.order ?? "desc" }
    : DEFAULT_TEAM_STATS_SORT;
  return (
    <CompetitionTeamStatsRoute
      competitionId={competitionId}
      onSortChange={(next) =>
        void navigate({
          replace: true,
          search: (previous) => ({ ...previous, sort: next.column, order: next.direction }),
        })
      }
      onViewChange={(view) =>
        void navigate({ replace: true, search: (previous) => ({ ...previous, view }) })
      }
      organizationId={orgId}
      sort={sort}
      view={search.view ?? DEFAULT_TEAM_STATS_VIEW}
    />
  );
}
