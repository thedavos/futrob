import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { publicRankingKindSchema } from "@futrob/api-contracts";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalLoading } from "@/modules/public-portal/presentation/public-portal-states.tsx";
import { PortalRankingView } from "@/modules/public-portal/presentation/public-portal-tables.tsx";
import { getPublicPortalRanking } from "@/modules/public-portal/server/public-portal.functions.ts";

/**
 * The ranking kind lives in the URL so each one can be linked. It stays optional so the bare
 * section URL renders top scorers with a 200 instead of redirecting to add a default.
 */
const searchSchema = z.object({
  kind: publicRankingKindSchema.optional().catch(undefined),
});

export const Route = createFileRoute("/$organizationSlug/$competitionKey/rankings")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ kind: search.kind ?? "scorer" }),
  loader: async ({ deps, params }) =>
    sectionRead(await getPublicPortalRanking({ data: { ...params, kind: deps.kind } })),
  pendingComponent: PortalLoading,
  component: PortalRankingsRoute,
});

function PortalRankingsRoute() {
  const read = Route.useLoaderData();
  const portalRef = Route.useParams();
  return (
    <PortalSectionRead read={read}>
      {({ ranking }) => <PortalRankingView portalRef={portalRef} ranking={ranking} />}
    </PortalSectionRead>
  );
}
