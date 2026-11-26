import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CompetitionBracketRoute } from "@/modules/scheduling/presentation/bracket/bracket-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

/** The followed Team and the view live in the URL so returning from an Encounter keeps them. */
const searchSchema = z.object({
  team: z.string().min(1).optional().catch(undefined),
  view: z.enum(["list"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/bracket")({
  validateSearch: searchSchema,
  head: localizedHead("bracket.documentTitle"),
  component: BracketPage,
});

function BracketPage() {
  const { orgId, competitionId } = Route.useParams();
  const { team, view } = Route.useSearch();
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
      onViewChange={(next) =>
        void navigate({
          replace: true,
          resetScroll: false,
          search: (previous) => ({ ...previous, view: next === "list" ? "list" : undefined }),
        })
      }
      organizationId={orgId}
      teamId={team ?? null}
      view={view ?? "canvas"}
    />
  );
}
