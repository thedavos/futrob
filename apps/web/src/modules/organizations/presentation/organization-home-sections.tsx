"use client";

import type { CompetitionDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { OrganizationRecentActivity } from "@/modules/notifications/presentation/organization-recent-activity.tsx";
import { OrganizationHomeCompetitionsTable } from "./organization-home-competitions-table.tsx";
import { recentOrganizationCompetitions } from "./organization-home-model.ts";

const styles = stylex.create({
  stack: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "1rem",
  },
});

export function OrganizationHomeSections({
  competitions,
  organizationId,
}: {
  readonly competitions: readonly CompetitionDto[];
  readonly organizationId: string;
}) {
  const listed = recentOrganizationCompetitions(competitions);

  return (
    <div {...applyStyles(styles.stack)}>
      <OrganizationHomeCompetitionsTable competitions={listed} organizationId={organizationId} />
      <OrganizationRecentActivity organizationId={organizationId} />
    </div>
  );
}
