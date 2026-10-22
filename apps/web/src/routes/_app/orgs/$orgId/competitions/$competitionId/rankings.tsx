import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { rankingKindSchema } from "@futrob/api-contracts";
import { CompetitionRankingsRoute } from "@/modules/statistics/presentation/competition-rankings/competition-rankings-page.tsx";
import { DEFAULT_RANKING_KIND } from "@/modules/statistics/presentation/competition-rankings/competition-rankings-view.ts";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/rankings")({
  validateSearch: z.object({ kind: rankingKindSchema.optional().catch(undefined) }),
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "pages.competition.rankings.title"),
  component: RankingsPage,
});

function RankingsPage() {
  const { orgId, competitionId } = Route.useParams();
  const { kind } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CompetitionRankingsRoute
      competitionId={competitionId}
      onRankingKindChange={(next) =>
        void navigate({
          search: next === DEFAULT_RANKING_KIND ? {} : { kind: next },
          replace: true,
        })
      }
      organizationId={orgId}
      rankingKind={kind ?? DEFAULT_RANKING_KIND}
    />
  );
}
