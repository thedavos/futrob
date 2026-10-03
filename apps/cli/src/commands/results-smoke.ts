import { Effect } from "effect";
import {
  AssociateEncounterCandidatesUseCase,
  ConfirmOfficialSelectionUseCase,
  RejectOfficialSelectionUseCase,
  ResolveMatchDisputeUseCase,
  ReviewMatchDisputeUseCase,
  SelectOfficialMatchesUseCase,
  asEncounterStageId,
  type EncounterCandidateAssociation,
  type EncounterCandidateAssociationRepository,
  type EncounterReaderPort,
  type ProviderMatchReaderPort,
} from "@futrob/results";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import type {
  AuthorizationDecision,
  AuthorizationPort,
  ClockPort,
  DomainEvent,
  EffectiveAccess,
  EventPublisherPort,
  IdGeneratorPort,
} from "@futrob/shared-kernel";
import type { ExternalReference, ProviderMatch } from "@futrob/game-data";
import { externalReferenceKey } from "@futrob/game-data";
import { print, printJson } from "../lib/print.ts";
import { SmokeResults, SmokeSelections, smokeTeamRepresentation } from "./results-smoke-fakes.ts";

const ORG = asOrganizationId("org_smoke");
const COMP = asCompetitionId("comp_smoke");
const ENCOUNTER = asEncounterId("enc_smoke_1");
const DISPUTED_ENCOUNTER = asEncounterId("enc_smoke_2");
const HOME = asTeamId("team_home");
const AWAY = asTeamId("team_away");
const ORGANIZER = asActorId("actor_organizer");
const HOME_CAPTAIN = asActorId("actor_home_captain");
const AWAY_CAPTAIN = asActorId("actor_away_captain");

const ref = (externalId: string): ExternalReference => ({
  providerKey: "ea-clubs",
  externalId,
});

function fakeProviderMatch(externalId: string): ProviderMatch {
  return {
    id: `pm_${externalId}`,
    provider: { key: "ea-clubs", externalMatchId: externalId },
    game: { edition: "fc26", platform: "playstation", mode: "clubs" },
    occurredAt: new Date("2026-08-01T19:00:00.000Z"),
    home: { externalClubId: "1001", name: "Home FC", goals: 3, imageUrl: null },
    away: { externalClubId: "1002", name: "Away FC", goals: 1, imageUrl: null },
    players: [
      {
        externalPlayerId: "p1",
        displayName: "Smoke Player",
        externalClubId: "1001",
        position: "ST",
        minutesPlayed: 90,
        goals: 2,
        assists: 0,
        shots: 4,
        passAttempts: 20,
        passesMade: 15,
        tackleAttempts: 1,
        tacklesMade: 1,
        saves: 0,
        yellowCards: 0,
        redCards: 0,
        isMvp: true,
        rating: 9.1,
      },
    ],
    metadata: {
      durationSeconds: 5400,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
}

const encounterReader: EncounterReaderPort = {
  getById: (encounterId) =>
    Promise.resolve(
      encounterId === ENCOUNTER || encounterId === DISPUTED_ENCOUNTER
        ? {
            encounterId,
            organizationId: ORG,
            competitionId: COMP,
            stageId: asEncounterStageId("stage-1"),
            homeTeamId: HOME,
            awayTeamId: AWAY,
            scheduledStartAt: new Date("2026-08-01T18:00:00.000Z"),
            officialMatchCount: 1 as const,
            homeExternalClubId: "1001",
            awayExternalClubId: "1002",
            providerKey: "ea-clubs",
          }
        : null,
    ),
};

const providerMatches: ProviderMatchReaderPort = {
  listCandidatesForEncounter: () =>
    Promise.resolve({
      status: "ready",
      matches: [fakeProviderMatch("m1"), fakeProviderMatch("m2")],
    }),
  getByExternalRef: (candidate) =>
    Promise.resolve(
      candidate.externalId === "m1" || candidate.externalId === "m2"
        ? fakeProviderMatch(candidate.externalId)
        : null,
    ),
};

const authorization: AuthorizationPort = {
  decide: (request): Promise<AuthorizationDecision> =>
    Promise.resolve({
      allowed: true,
      permission: request.permission,
      scope: request.scope,
      reason: "allowed",
    }),
  getEffectiveAccess: (input): Promise<EffectiveAccess> =>
    Promise.resolve({ actorId: input.actorId, scope: input.scope, roles: [], permissions: [] }),
};

const ids: IdGeneratorPort = {
  generate: (() => {
    let counter = 0;
    return () => `id_${(counter += 1)}`;
  })(),
};

const clock: ClockPort = { now: () => new Date("2026-08-02T00:00:00.000Z") };

async function smoke(): Promise<number> {
  const events: DomainEvent[] = [];
  const eventPublisher: EventPublisherPort = {
    publish: (event) => {
      events.push(event);
      return Promise.resolve();
    },
    publishMany: (published) => {
      events.push(...published);
      return Promise.resolve();
    },
  };

  const selections = new SmokeSelections();
  const results = new SmokeResults();
  const teamRepresentation = smokeTeamRepresentation([
    [HOME_CAPTAIN, HOME],
    [AWAY_CAPTAIN, AWAY],
  ]);

  const associations = new (class implements EncounterCandidateAssociationRepository {
    rows: EncounterCandidateAssociation[] = [];
    private generation = 0;

    async loadForEncounter(
      organizationId: EncounterCandidateAssociation["organizationId"],
      encounterId: EncounterCandidateAssociation["encounterId"],
    ) {
      return {
        associations: await this.listByEncounter(organizationId, encounterId),
        generation: this.generation,
      };
    }

    async replaceForEncounter(
      organizationId: EncounterCandidateAssociation["organizationId"],
      encounterId: EncounterCandidateAssociation["encounterId"],
      rows: readonly EncounterCandidateAssociation[],
      expectedGeneration: number,
    ) {
      if (expectedGeneration !== this.generation) {
        return { status: "conflict" as const, generation: this.generation };
      }
      this.rows = this.rows.filter(
        (row) => row.organizationId !== organizationId || row.encounterId !== encounterId,
      );
      this.rows.push(...rows);
      this.generation += 1;
      return { status: "replaced" as const, associations: rows, generation: this.generation };
    }

    async listByEncounter(
      organizationId: EncounterCandidateAssociation["organizationId"],
      encounterId: EncounterCandidateAssociation["encounterId"],
    ) {
      return this.rows.filter(
        (row) => row.organizationId === organizationId && row.encounterId === encounterId,
      );
    }

    async findByRef(
      organizationId: EncounterCandidateAssociation["organizationId"],
      encounterId: EncounterCandidateAssociation["encounterId"],
      providerMatchRef: ExternalReference,
    ) {
      const key = externalReferenceKey(providerMatchRef);
      return (
        this.rows.find(
          (row) =>
            row.organizationId === organizationId &&
            row.encounterId === encounterId &&
            externalReferenceKey(row.providerMatchRef) === key,
        ) ?? null
      );
    }

    async writeIfEligible<T>(
      organizationId: EncounterCandidateAssociation["organizationId"],
      encounterId: EncounterCandidateAssociation["encounterId"],
      requiredRefs: readonly ExternalReference[],
      write: () => Promise<T>,
    ) {
      for (const providerMatchRef of requiredRefs) {
        const association = await this.findByRef(organizationId, encounterId, providerMatchRef);
        if (!association || !association.eligible) {
          return { status: "ineligible" as const, providerMatchRef };
        }
      }
      return { status: "wrote" as const, value: await write() };
    }
  })();

  const associate = new AssociateEncounterCandidatesUseCase({
    encounterReader,
    providerMatches,
    associations,
    clock,
  });
  for (const encounterId of [ENCOUNTER, DISPUTED_ENCOUNTER]) {
    const associated = await associate.execute({ organizationId: ORG, encounterId });
    if (!associated.isOk() || associated.value.status !== "associated") {
      print(
        `associate falló: ${JSON.stringify(associated.isOk() ? associated.value : associated.error)}`,
      );
      return 1;
    }
  }

  const common = {
    encounterReader,
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
  const select = new SelectOfficialMatchesUseCase(common);
  const confirm = new ConfirmOfficialSelectionUseCase(common);
  const reject = new RejectOfficialSelectionUseCase(common);
  const review = new ReviewMatchDisputeUseCase(common);
  const resolve = new ResolveMatchDisputeUseCase(common);

  // Agreement: home proposes, the rival confirms the same version.
  const selected = await select.execute({
    actorId: HOME_CAPTAIN,
    organizationId: ORG,
    encounterId: ENCOUNTER,
    actingTeamId: HOME,
    selections: [{ officialSlot: 1, providerMatchRef: ref("m1") }],
    expectedVersion: 0,
    commandKey: "smoke-propose-1",
  });
  if (!selected.isOk() || !selected.value.proposal) {
    print(`select falló: ${selected.isOk() ? "sin propuesta" : JSON.stringify(selected.error)}`);
    return 1;
  }
  const proposal = selected.value.proposal;

  const duplicate = await select.execute({
    actorId: HOME_CAPTAIN,
    organizationId: ORG,
    encounterId: DISPUTED_ENCOUNTER,
    actingTeamId: HOME,
    selections: [
      { officialSlot: 1, providerMatchRef: ref("m2") },
      { officialSlot: 2, providerMatchRef: ref("m2") },
    ],
    expectedVersion: 0,
    commandKey: "smoke-invalid",
  });
  if (duplicate.isOk() || duplicate.error.code !== "results.invalid_selection") {
    print("se esperaba results.invalid_selection para count != officialMatchCount");
    return 1;
  }

  const selfConfirmation = await confirm.execute({
    actorId: HOME_CAPTAIN,
    organizationId: ORG,
    encounterId: ENCOUNTER,
    actingTeamId: HOME,
    proposalId: proposal.id,
    expectedVersion: selected.value.selection.version,
    commandKey: "smoke-self-confirm",
  });
  if (
    selfConfirmation.isOk() ||
    selfConfirmation.error.code !== "results.self_confirmation_forbidden"
  ) {
    print("se esperaba results.self_confirmation_forbidden");
    return 1;
  }

  const confirmed = await confirm.execute({
    actorId: AWAY_CAPTAIN,
    organizationId: ORG,
    encounterId: ENCOUNTER,
    actingTeamId: AWAY,
    proposalId: proposal.id,
    expectedVersion: selected.value.selection.version,
    commandKey: "smoke-confirm",
  });
  if (!confirmed.isOk() || !confirmed.value.approvedResult) {
    print(`confirm falló: ${confirmed.isOk() ? "sin resultado" : JSON.stringify(confirmed.error)}`);
    return 1;
  }
  const approved = confirmed.value.approvedResult;

  // Disagreement: the rival rejects, an operator takes the case and resolves it.
  const second = await select.execute({
    actorId: HOME_CAPTAIN,
    organizationId: ORG,
    encounterId: DISPUTED_ENCOUNTER,
    actingTeamId: HOME,
    selections: [{ officialSlot: 1, providerMatchRef: ref("m2") }],
    expectedVersion: 0,
    commandKey: "smoke-propose-2",
  });
  if (!second.isOk() || !second.value.proposal) {
    print(
      `segundo select falló: ${second.isOk() ? "sin propuesta" : JSON.stringify(second.error)}`,
    );
    return 1;
  }
  const rejected = await reject.execute({
    actorId: AWAY_CAPTAIN,
    organizationId: ORG,
    encounterId: DISPUTED_ENCOUNTER,
    actingTeamId: AWAY,
    proposalId: second.value.proposal.id,
    expectedVersion: second.value.selection.version,
    reason: "Ese no fue el partido oficial",
    commandKey: "smoke-reject",
  });
  if (!rejected.isOk() || rejected.value.selection.status !== "disputed") {
    print("se esperaba disputed tras el rechazo");
    return 1;
  }
  if (await results.findApprovedByEncounter(DISPUTED_ENCOUNTER)) {
    print("una disputa no debe oficializar un resultado");
    return 1;
  }
  const reviewed = await review.execute({
    actorId: ORGANIZER,
    organizationId: ORG,
    encounterId: DISPUTED_ENCOUNTER,
    expectedVersion: rejected.value.selection.version,
    commandKey: "smoke-review",
  });
  if (!reviewed.isOk()) {
    print(`review falló: ${JSON.stringify(reviewed.error)}`);
    return 1;
  }
  const resolved = await resolve.execute({
    actorId: ORGANIZER,
    organizationId: ORG,
    encounterId: DISPUTED_ENCOUNTER,
    expectedVersion: reviewed.value.selection.version,
    decision: { type: "approve_proposal", proposalId: second.value.proposal.id },
    reason: "El organizador verificó la evidencia",
    commandKey: "smoke-resolve",
  });
  if (!resolved.isOk() || !resolved.value.approvedResult) {
    print(`resolve falló: ${resolved.isOk() ? "sin resultado" : JSON.stringify(resolved.error)}`);
    return 1;
  }

  const eventNames = events.map((event) => event.eventName);
  const expectedEvents = [
    "results.official-matches-selected",
    "results.official-selection-confirmed",
    "results.match-dispute-opened",
    "results.official-result-approved",
  ];
  if (!expectedEvents.every((name) => eventNames.includes(name))) {
    print(`eventos inesperados: ${eventNames.join(", ")}`);
    return 1;
  }

  print("results-smoke ok");
  printJson({
    agreement: {
      selectionStatus: confirmed.value.selection.status,
      officialResultId: approved.id,
      revision: approved.revision,
      score: `${approved.slots[0]?.homeGoals}-${approved.slots[0]?.awayGoals}`,
    },
    dispute: {
      selectionStatus: resolved.value.selection.status,
      disputeStatus: resolved.value.dispute?.status ?? null,
      officialResultId: resolved.value.approvedResult.id,
    },
    events: eventNames,
  });
  return 0;
}

export function run(): Effect.Effect<number> {
  return Effect.promise(smoke);
}
