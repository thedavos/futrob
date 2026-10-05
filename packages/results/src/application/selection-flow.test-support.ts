import type { ExternalReference, ProviderMatch } from "@futrob/game-data";
import type { SelectionCommandDigestPort } from "../domain/ports/selection-command-digest.port.ts";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type AuthorizationPort,
  type AuthorizationRequest,
  type DomainEvent,
  type EncounterId,
  type EventPublisherPort,
  type Permission,
  type TeamId,
} from "@futrob/shared-kernel";
import {
  asEncounterStageId,
  type EncounterReaderPort,
  type EncounterScheduleSnapshot,
} from "../domain/ports/encounter-reader.port.ts";
import type {
  TeamRepresentation,
  TeamRepresentationPort,
} from "../domain/ports/team-representation.port.ts";
import {
  MemoryOfficialResults,
  MemoryOfficialSelections,
  MemoryReferenceClaims,
} from "./selection-memory.test-support.ts";
import { RESULT_PERMISSION } from "../domain/policies/result-permissions.ts";
import { encounterCandidateAssociationId } from "../domain/policies/reconcile-candidate-associations.ts";
import { ConfirmOfficialSelectionUseCase } from "./confirm-official-selection/confirm-official-selection.use-case.ts";
import { GetOfficialSelectionUseCase } from "./get-official-selection/get-official-selection.use-case.ts";
import { OpenMatchDisputeUseCase } from "./open-match-dispute/open-match-dispute.use-case.ts";
import { ProposeAlternativeOfficialSelectionUseCase } from "./propose-alternative-official-selection/propose-alternative-official-selection.use-case.ts";
import { RejectOfficialSelectionUseCase } from "./reject-official-selection/reject-official-selection.use-case.ts";
import { ResolveMatchDisputeUseCase } from "./resolve-match-dispute/resolve-match-dispute.use-case.ts";
import { ReviewMatchDisputeUseCase } from "./review-match-dispute/review-match-dispute.use-case.ts";
import { SelectOfficialMatchesUseCase } from "./select-official-matches/select-official-matches.use-case.ts";
import { VoidOfficialResultUseCase } from "./void-official-result/void-official-result.use-case.ts";
import {
  MemoryEncounterCandidateAssociations,
  WindowedProviderMatchReader,
  providerMatch,
} from "./encounter-candidates.test-support.ts";

class MultiEncounterReader implements EncounterReaderPort {
  readonly encounters = new Map<string, EncounterScheduleSnapshot>();

  async getById(encounterId: EncounterId) {
    return this.encounters.get(encounterId) ?? null;
  }
}

/**
 * Mirrors the real resolver's shape: results permissions are scoped, a Team action
 * needs a Team of the Encounter, and only explicit grants count.
 */
export class ScriptedAuthorization implements AuthorizationPort {
  private readonly grants = new Map<string, Set<Permission>>();
  readonly requests: AuthorizationRequest[] = [];

  allow(actor: ActorId, ...permissions: Permission[]) {
    const set = this.grants.get(actor) ?? new Set<Permission>();
    for (const permission of permissions) set.add(permission);
    this.grants.set(actor, set);
  }

  revoke(actor: ActorId, permission: Permission) {
    this.grants.get(actor)?.delete(permission);
  }

  async decide(request: AuthorizationRequest) {
    this.requests.push(request);
    const allowed = this.grants.get(request.actorId)?.has(request.permission) ?? false;
    return {
      allowed,
      permission: request.permission,
      scope: request.scope,
      reason: allowed ? ("allowed" as const) : ("no-assignment" as const),
    };
  }

  async getEffectiveAccess(input: { actorId: ActorId; scope: AuthorizationRequest["scope"] }) {
    return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
  }
}

export class ScriptedTeamRepresentation implements TeamRepresentationPort {
  private readonly rows = new Map<string, TeamRepresentation>();

  set(actor: ActorId, teamId: TeamId, role: TeamRepresentation["role"] = "captain") {
    this.rows.set(`${actor}:${teamId}`, { teamId, role });
  }

  remove(actor: ActorId, teamId: TeamId) {
    this.rows.delete(`${actor}:${teamId}`);
  }

  async findRepresentation(input: { actorId: ActorId; teamId: TeamId }) {
    return this.rows.get(`${input.actorId}:${input.teamId}`) ?? null;
  }
}

export { MemoryOfficialResults, MemoryOfficialSelections, MemoryReferenceClaims };

/** Application tests model a stable opaque digest; Postgres composition proves SHA-256. */
export function createTestCommandDigest(): SelectionCommandDigestPort {
  const receipts = new Map<string, string>();
  return {
    sha256(canonical) {
      let receipt = receipts.get(canonical);
      if (!receipt) {
        receipt = (receipts.size + 1).toString(16).padStart(64, "0");
        receipts.set(canonical, receipt);
      }
      return receipt;
    },
  };
}

export const ORG = asOrganizationId("org-1");
export const COMPETITION = asCompetitionId("competition-1");
export const ENCOUNTER = asEncounterId("enc-1");
export const HOME = asTeamId("home");
export const AWAY = asTeamId("away");

export const ACTORS = {
  homeCaptain: asActorId("actor-home-captain"),
  homeVice: asActorId("actor-home-vice"),
  awayCaptain: asActorId("actor-away-captain"),
  awayVice: asActorId("actor-away-vice"),
  operator: asActorId("actor-operator"),
  staffNoGrant: asActorId("actor-staff"),
  outsider: asActorId("actor-outsider"),
} as const;

export const EVENTS = {
  selected: "results.official-matches-selected",
  confirmed: "results.official-selection-confirmed",
  disputeOpened: "results.match-dispute-opened",
  approved: "results.official-result-approved",
  voided: "results.official-result-voided",
} as const;

function ref(externalId: string): ExternalReference {
  return { providerKey: "ea-clubs", externalId };
}

export function slotRefs(...externalIds: string[]) {
  return externalIds.map((externalId, index) => ({
    officialSlot: index === 0 ? (1 as const) : (2 as const),
    providerMatchRef: ref(externalId),
  }));
}

export interface HarnessOptions {
  readonly officialMatchCount?: 1 | 2;
  readonly matchIds?: readonly string[];
  readonly incompleteMatchIds?: readonly string[];
  readonly claims?: MemoryReferenceClaims;
}

export function createSelectionHarness(options: HarnessOptions = {}) {
  const events: DomainEvent[] = [];
  const eventPublisher: EventPublisherPort = {
    publish: async (event) => {
      events.push(event);
    },
    publishMany: async (batch) => {
      events.push(...batch);
    },
  };
  let idCounter = 0;
  const ids = { generate: () => `id-${++idCounter}` };
  const clockState = { now: new Date("2026-09-14T21:00:00.000Z") };
  const clock = { now: () => clockState.now };

  const matchIds = options.matchIds ?? ["m-1", "m-2", "m-3"];
  const matches: ProviderMatch[] = matchIds.map((id) => {
    const base = providerMatch(id, "2026-09-14T20:00:00.000Z");
    return options.incompleteMatchIds?.includes(id)
      ? { ...base, metadata: { ...base.metadata, completeness: "partial" as const } }
      : base;
  });
  const providerMatches = new WindowedProviderMatchReader(matches);

  const reader = new MultiEncounterReader();
  const snapshot = (encounterId: string): EncounterScheduleSnapshot => ({
    encounterId: asEncounterId(encounterId),
    organizationId: ORG,
    competitionId: COMPETITION,
    stageId: asEncounterStageId("stage-1"),
    homeTeamId: HOME,
    awayTeamId: AWAY,
    scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
    officialMatchCount: options.officialMatchCount ?? 1,
    homeExternalClubId: "club-home",
    awayExternalClubId: "club-away",
    providerKey: "ea-clubs",
  });
  reader.encounters.set(ENCOUNTER, snapshot(ENCOUNTER));

  const associations = new MemoryEncounterCandidateAssociations();
  const selections = new MemoryOfficialSelections(options.claims);
  const results = new MemoryOfficialResults();
  const authorization = new ScriptedAuthorization();
  const teamRepresentation = new ScriptedTeamRepresentation();

  for (const actor of [ACTORS.homeCaptain, ACTORS.homeVice]) {
    teamRepresentation.set(actor, HOME, actor === ACTORS.homeVice ? "vice_captain" : "captain");
    authorization.allow(
      actor,
      RESULT_PERMISSION.officialSelectionPropose,
      RESULT_PERMISSION.officialSelectionResolve,
    );
  }
  for (const actor of [ACTORS.awayCaptain, ACTORS.awayVice]) {
    teamRepresentation.set(actor, AWAY, actor === ACTORS.awayVice ? "vice_captain" : "captain");
    authorization.allow(
      actor,
      RESULT_PERMISSION.officialSelectionPropose,
      RESULT_PERMISSION.officialSelectionResolve,
    );
  }
  authorization.allow(ACTORS.operator, RESULT_PERMISSION.resultApprove);

  async function associate(
    encounterId: EncounterId,
    externalIds: readonly string[],
    eligible = true,
  ) {
    const existing = await associations.loadForEncounter(ORG, encounterId);
    const rows = [
      ...existing.associations,
      ...externalIds.map((externalId) => ({
        id: encounterCandidateAssociationId(ORG, encounterId, ref(externalId)),
        organizationId: ORG,
        encounterId,
        providerMatchRef: ref(externalId),
        eligible,
        associatedAt: clockState.now,
        lastEvaluatedAt: clockState.now,
      })),
    ];
    await associations.replaceForEncounter(ORG, encounterId, rows, existing.generation);
  }

  const common = {
    commandDigest: createTestCommandDigest(),
    encounterReader: reader,
    selections,
    results,
    associations,
    providerMatches,
    teamRepresentation,
    eventPublisher,
    authorization,
    ids,
    clock,
  };

  let keyCounter = 0;
  const nextKey = () => `key-${++keyCounter}`;

  const useCases = {
    propose: new SelectOfficialMatchesUseCase(common),
    confirm: new ConfirmOfficialSelectionUseCase(common),
    reject: new RejectOfficialSelectionUseCase(common),
    alternative: new ProposeAlternativeOfficialSelectionUseCase(common),
    openDispute: new OpenMatchDisputeUseCase(common),
    review: new ReviewMatchDisputeUseCase(common),
    resolve: new ResolveMatchDisputeUseCase(common),
    get: new GetOfficialSelectionUseCase(common),
    void: new VoidOfficialResultUseCase(common),
  };

  const base = (encounterId: EncounterId = ENCOUNTER) => ({
    organizationId: ORG,
    encounterId,
  });

  return {
    ...common,
    events,
    clockState,
    useCases,
    nextKey,
    reader,
    addEncounter(encounterId: string) {
      reader.encounters.set(encounterId, snapshot(encounterId));
      return asEncounterId(encounterId);
    },
    associate,
    eventNames: () => events.map((event) => event.eventName),
    base,
    /** Home captain proposes `externalIds` for slots 1..n. */
    async propose(
      externalIds: readonly string[],
      overrides: Partial<Parameters<SelectOfficialMatchesUseCase["execute"]>[0]> = {},
    ) {
      return useCases.propose.execute({
        ...base(),
        actorId: ACTORS.homeCaptain,
        actingTeamId: HOME,
        selections: slotRefs(...externalIds),
        expectedVersion: 0,
        commandKey: nextKey(),
        ...overrides,
      });
    },
  };
}

export type SelectionHarness = ReturnType<typeof createSelectionHarness>;
