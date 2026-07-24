export type Brand<T, B extends string> = T & { readonly __brand: B };

export type ActorId = Brand<string, "ActorId">;
export type OrganizationId = Brand<string, "OrganizationId">;
export type CompetitionId = Brand<string, "CompetitionId">;
export type TeamId = Brand<string, "TeamId">;
export type EncounterId = Brand<string, "EncounterId">;
export type OfficialMatchSlotId = Brand<string, "OfficialMatchSlotId">;
export type ProviderMatchId = Brand<string, "ProviderMatchId">;

export function asActorId(value: string): ActorId {
  return value as ActorId;
}

export function asOrganizationId(value: string): OrganizationId {
  return value as OrganizationId;
}

export function asCompetitionId(value: string): CompetitionId {
  return value as CompetitionId;
}

export function asTeamId(value: string): TeamId {
  return value as TeamId;
}

export function asEncounterId(value: string): EncounterId {
  return value as EncounterId;
}
