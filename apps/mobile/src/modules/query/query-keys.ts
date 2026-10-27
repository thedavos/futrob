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
  playerProfile: (generation: SessionGeneration) =>
    [...sessionScope(generation), "player-profile"] as const,
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
