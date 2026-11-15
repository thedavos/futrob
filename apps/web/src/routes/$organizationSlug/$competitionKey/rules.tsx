import { createFileRoute } from "@tanstack/react-router";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalLoading } from "@/modules/public-portal/presentation/public-portal-states.tsx";
import { PortalRulesView } from "@/modules/public-portal/presentation/public-portal-structure.tsx";
import { getPublicPortalRules } from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/rules")({
  loader: async ({ params }) => sectionRead(await getPublicPortalRules({ data: params })),
  pendingComponent: PortalLoading,
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
