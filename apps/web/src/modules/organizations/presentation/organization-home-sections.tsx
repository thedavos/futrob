"use client";

import type { CompetitionDto } from "@futrob/api-contracts";
import { applyStyles } from "@futrob/ui";
import { OrganizationRecentActivity } from "@/modules/notifications/presentation/organization-recent-activity.tsx";
import { OrganizationHomeCompetitionsTable } from "./organization-home-competitions-table.tsx";
import { recentOrganizationCompetitions } from "./organization-home-model.ts";
import { organizationHomeLayout } from "./organization-home.styles.ts";

export function OrganizationHomeSections({
  competitions,
  organizationId,
}: {
  readonly competitions: readonly CompetitionDto[];
  readonly organizationId: string;
}) {
  const listed = recentOrganizationCompetitions(competitions);

  return (
    <div {...applyStyles(organizationHomeLayout.stack)}>
      <OrganizationHomeCompetitionsTable competitions={listed} organizationId={organizationId} />
      <OrganizationRecentActivity organizationId={organizationId} />
    </div>
  );
}
