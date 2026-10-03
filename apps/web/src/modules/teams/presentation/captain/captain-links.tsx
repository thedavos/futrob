import type { ReactElement } from "react";
import { Link } from "@tanstack/react-router";

export type CaptainLinks = {
  readonly team: ReactElement;
  readonly roster: ReactElement;
  readonly invitations: ReactElement;
};

/**
 * Router links between the captain pages. The same pages live under the organization route
 * and under the player's own competition route; only the path differs.
 */
export function captainLinks(organizationId: string | null, competitionId: string): CaptainLinks {
  if (organizationId !== null) {
    const params = { orgId: organizationId, competitionId };
    return {
      team: <Link params={params} to="/orgs/$orgId/competitions/$competitionId/team" />,
      roster: <Link params={params} to="/orgs/$orgId/competitions/$competitionId/team/roster" />,
      invitations: (
        <Link params={params} to="/orgs/$orgId/competitions/$competitionId/team/invitations" />
      ),
    };
  }
  const params = { competitionId };
  return {
    team: <Link params={params} to="/player/competitions/$competitionId/team" />,
    roster: <Link params={params} to="/player/competitions/$competitionId/team/roster" />,
    invitations: <Link params={params} to="/player/competitions/$competitionId/team/invitations" />,
  };
}
