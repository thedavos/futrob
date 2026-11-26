import { createFileRoute } from "@tanstack/react-router";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalRulesLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import { PortalRulesView } from "@/modules/public-portal/presentation/public-portal-structure.tsx";
import { getPublicPortalRules } from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/rules")({
  loader: async ({ params }) => sectionRead(await getPublicPortalRules({ data: params })),
  pendingComponent: PortalRulesLoading,
  component: PortalRulesRoute,
});

function PortalRulesRoute() {
  const read = Route.useLoaderData();
  return (
    <PortalSectionRead read={read}>
      {({ rules }) => <PortalRulesView rules={rules} />}
    </PortalSectionRead>
  );
}
