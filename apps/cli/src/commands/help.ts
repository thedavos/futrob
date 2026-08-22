import { Effect } from "effect";
import { print } from "../lib/print.ts";

export function run(): Effect.Effect<number> {
  return Effect.sync(() => {
    print(HELP_TEXT);
    return 0;
  });
}

export const HELP_TEXT = `futrob cli — playground de dominio + smoke de API

Uso:
  npm run cli -- <comando> [args]

Comandos base:
  help                    Esta ayuda
  ping                    Comprueba que el CLI arranca
  domain-smoke            Smoke de shared-kernel + tipos de scheduling/results
  domain-smoke-game-data  Smoke de @futrob/game-data (pure helpers + use case con fake)
  statistics-smoke        Smoke de GetMyPersonalStatisticsUseCase con fakes
  results-smoke           Select → Confirm con fakes en memoria (@futrob/results)

Integración (requieren npm run dev; auth: FUTROB_INTERNAL_JOB_SECRET + --actor):
  api-health              GET /meta/ping
  org-name-check <name>   Disponibilidad de nombre de organización
  org-create <name>       Crea organización
  org-mine                Lista membresías del actor
  org-invite <orgId> <email> [--role role]
  onboarding-status       Estado de onboarding del actor
  comp-create <orgId> <name>
  comp-list <orgId>
  comp-show <orgId> <compId>
  comp-publish <orgId> <compId>
  participant-add <orgId> <compId> <teamId>
  participant-list <orgId> <compId>
  entry-register <orgId> <compId> <teamId>
  entry-approve <orgId> <compId> <entryId>
  entry-reject <orgId> <compId> <entryId>
  standings <orgId> <compId>
  team-create <orgId> <name>
  team-list <orgId>
  roster-list <orgId> <compId> <teamId>
  roster-add <orgId> <compId> <teamId> <playerProfileId> [--role captain]
  roster-close <orgId> <compId> <teamId>
  roster-open <orgId> <compId> <teamId>
  club-link <orgId> <compId> <teamId> <externalClubId> <externalClubName> [--platform p] [--edition e]
  fixture-generate <orgId> <compId> [--starts-at ISO] [--interval-days 7]
  fixture-show <orgId> <compId> <fixturePlanId>
  snapshot-set <encounterId> <orgId> <compId> <homeTeamId> <awayTeamId> <startISO> [--slots 1|2]
  club-search <query>
  club-get <externalClubId>
  club-matches <externalClubId>
  sync-job-enqueue <orgId> <clubId> [--platform playstation] [--edition fc26] [--match-type club_match] [--max 10]
  sync-job-run <jobId>
  sync-job-run-next
  provider-health [providerKey]
  player-me
  my-stats
  my-matches
  e2e-golden-path         Org → comp → team → entry → publish → fixture (smoke completo)

Flags comunes: --json, --base-url URL, --actor ID
Env: FUTROB_API_BASE_URL, FUTROB_ACTOR_ID, FUTROB_ACCESS_TOKEN | FUTROB_INTERNAL_JOB_SECRET

Guía: apps/cli/README.md
`;
