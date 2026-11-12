import type { QueryKey } from "@tanstack/react-query";
import type { SessionGeneration } from "@/modules/identity/session-store";

const SESSION_SCOPE = "session";

/** Private data is read for one session; its keys start with that session's generation. */
const sessionScope = (generation: SessionGeneration) => [SESSION_SCOPE, generation] as const;

export const mobileQueryKeys = {
  sessionGate: (generation: SessionGeneration) =>
    [...sessionScope(generation), "session-gate"] as const,
  onboardingFlow: (generation: SessionGeneration, step: string) =>
    [...sessionScope(generation), "onboarding-flow", step] as const,
  playerHome: (generation: SessionGeneration, externalClubId: string | undefined) =>
    [...sessionScope(generation), "player-home", externalClubId] as const,
  accountSessions: (generation: SessionGeneration) =>
    [...sessionScope(generation), "account-sessions"] as const,
  accountDeletion: (generation: SessionGeneration) =>
    [...sessionScope(generation), "account-deletion"] as const,
  playerProfile: (generation: SessionGeneration) =>
    [...sessionScope(generation), "player-profile"] as const,
  workspaceOptions: (generation: SessionGeneration) =>
    [...sessionScope(generation), "workspace-options"] as const,
  contextAccess: (
    generation: SessionGeneration,
    scope: { readonly organizationId?: string; readonly competitionId?: string },
  ) =>
    [
      ...sessionScope(generation),
      "context-access",
      scope.organizationId,
      scope.competitionId,
    ] as const,
  /** One competition read (`fixture`, `standings`, `team:<id>`…) for the session. */
  competitionRead: (
    generation: SessionGeneration,
    organizationId: string,
    competitionId: string,
    resource: string,
  ) =>
    [...sessionScope(generation), "competition", organizationId, competitionId, resource] as const,
  destination: (
    generation: SessionGeneration,
    destination: {
      readonly kind: string;
      readonly organizationId?: string;
      readonly competitionId?: string;
    },
  ) =>
    [
      ...sessionScope(generation),
      "native-destination",
      destination.kind,
      destination.organizationId,
      destination.competitionId,
    ] as const,
} as const;

export function belongsToEndedSession(queryKey: QueryKey, current: SessionGeneration): boolean {
  return queryKey[0] === SESSION_SCOPE && queryKey[1] !== current;
}
