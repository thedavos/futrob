import { Effect } from "effect";
import {
  ConfirmOfficialSelectionUseCase,
  SelectOfficialMatchesUseCase,
  type OfficialMatchSelection,
  type OfficialResult,
  type OfficialResultRepository,
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
import { print, printJson } from "../lib/print.ts";

const ORG = asOrganizationId("org_smoke");
const COMP = asCompetitionId("comp_smoke");
const ENCOUNTER = asEncounterId("enc_smoke_1");
const ORGANIZER = asActorId("actor_organizer");
const OPPONENT = asActorId("actor_opponent");

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
      encounterId === ENCOUNTER
        ? {
            encounterId,
            organizationId: ORG,
            competitionId: COMP,
            homeTeamId: asTeamId("team_home"),
            awayTeamId: asTeamId("team_away"),
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
    Promise.resolve([fakeProviderMatch("m1"), fakeProviderMatch("m2")]),
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

  let savedSelection: OfficialMatchSelection | null = null;
  const selections = {
    save: (selection: OfficialMatchSelection) => {
      savedSelection = selection;
      return Promise.resolve(selection);
    },
    findLatestByEncounter: () => Promise.resolve(savedSelection),
  };

  const resultsById = new Map<string, OfficialResult>();
  const results: OfficialResultRepository = {
    save: (result) => {
      resultsById.set(result.id, result);
      return Promise.resolve(result);
    },
    findApprovedByEncounter: () => {
      for (const result of resultsById.values()) {
        if (result.status === "approved") return Promise.resolve(result);
      }
      return Promise.resolve(null);
    },
    findLatestByEncounter: () => {
      let latest: OfficialResult | null = null;
      for (const result of resultsById.values()) latest = result;
      return Promise.resolve(latest);
    },
    findById: (id) => Promise.resolve(resultsById.get(id) ?? null),
    listByCompetition: () => Promise.resolve([...resultsById.values()]),
    listByEncounter: () => Promise.resolve([...resultsById.values()]),
  };

  const select = new SelectOfficialMatchesUseCase({
    encounterReader,
    selections,
    eventPublisher,
    authorization,
    ids,
    clock,
  });

  const selected = await select.execute({
    actorId: OPPONENT,
    organizationId: ORG,
    encounterId: ENCOUNTER,
    selections: [{ officialSlot: 1, providerMatchRef: ref("m1") }],
  });
  if (!selected.isOk()) {
    print(`select falló: ${JSON.stringify(selected.error)}`);
    return 1;
  }

  const duplicate = await select.execute({
    actorId: ORGANIZER,
    organizationId: ORG,
    encounterId: ENCOUNTER,
    selections: [
      { officialSlot: 1, providerMatchRef: ref("m1") },
      { officialSlot: 2, providerMatchRef: ref("m1") },
    ],
  });
  if (duplicate.isOk() || duplicate.error.code !== "results.invalid_selection") {
    print("se esperaba results.invalid_selection para count != officialMatchCount");
    return 1;
  }

  const confirm = new ConfirmOfficialSelectionUseCase({
    encounterReader,
    selections,
    results,
    providerMatches,
    eventPublisher,
    authorization,
    ids,
    clock,
  });

  const confirmed = await confirm.execute({
    actorId: ORGANIZER,
    organizationId: ORG,
    encounterId: ENCOUNTER,
  });
  if (!confirmed.isOk()) {
    print(`confirm falló: ${JSON.stringify(confirmed.error)}`);
    return 1;
  }

  const eventNames = events.map((event) => event.eventName);
  if (
    !eventNames.includes("results.official-matches-selected") ||
    !eventNames.includes("results.official-result-approved")
  ) {
    print(`eventos inesperados: ${eventNames.join(", ")}`);
    return 1;
  }

  print("results-smoke ok");
  printJson({
    selectionStatus: "approved" as const,
    officialResultId: confirmed.value.id,
    revision: confirmed.value.revision,
    score: `${confirmed.value.slots[0]?.homeGoals}-${confirmed.value.slots[0]?.awayGoals}`,
    events: eventNames,
  });
  return 0;
}

export function run(): Effect.Effect<number> {
  return Effect.promise(smoke);
}
