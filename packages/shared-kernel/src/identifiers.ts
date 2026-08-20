export type Brand<T, B extends string> = T & { readonly __brand: B };

export type ActorId = Brand<string, "ActorId">;
export type OrganizationId = Brand<string, "OrganizationId">;
export type CompetitionId = Brand<string, "CompetitionId">;
export type TeamId = Brand<string, "TeamId">;
export type EncounterId = Brand<string, "EncounterId">;
export type OfficialMatchSlotId = Brand<string, "OfficialMatchSlotId">;
export type ProviderMatchId = Brand<string, "ProviderMatchId">;

export function asActorId(value: string): ActorId {
  // SAFETY: Compile-time brand marker; caller validates string shape at the I/O boundary.
  return value as ActorId;
}

export function asOrganizationId(value: string): OrganizationId {
  // SAFETY: Compile-time brand marker; caller validates string shape at the I/O boundary.
  return value as OrganizationId;
}

export function asCompetitionId(value: string): CompetitionId {
  // SAFETY: Compile-time brand marker; caller validates string shape at the I/O boundary.
  return value as CompetitionId;
}

export function asTeamId(value: string): TeamId {
  // SAFETY: Compile-time brand marker; caller validates string shape at the I/O boundary.
  return value as TeamId;
}

export function asEncounterId(value: string): EncounterId {
  // SAFETY: Compile-time brand marker; caller validates string shape at the I/O boundary.
  return value as EncounterId;
}

export function asOfficialMatchSlotId(value: string): OfficialMatchSlotId {
  // SAFETY: Compile-time brand marker; caller validates string shape at the I/O boundary.
  return value as OfficialMatchSlotId;
}
