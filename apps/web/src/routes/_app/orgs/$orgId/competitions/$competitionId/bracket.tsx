import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CompetitionBracketRoute } from "@/modules/scheduling/presentation/bracket/bracket-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

/** The followed Team lives in the URL so returning from an Encounter keeps it. */
const searchSchema = z.object({
  team: z.string().min(1).optional().catch(undefined),
});

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/bracket")({
  validateSearch: searchSchema,
  head: localizedHead("bracket.documentTitle"),
  component: BracketPage,
});

function BracketPage() {
  const { orgId, competitionId } = Route.useParams();
  const { team } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CompetitionBracketRoute
      competitionId={competitionId}
      onTeamChange={(teamId) =>
        void navigate({
          replace: true,
          resetScroll: false,
          search: (previous) => ({ ...previous, team: teamId ?? undefined }),
        })
      }
      organizationId={orgId}
      teamId={team ?? null}
    />
  );
}
