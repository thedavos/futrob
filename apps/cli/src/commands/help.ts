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
  statistics-rebuild <orgId> <compId>  Reconstruir estadísticas y rankings (superusuario)
  statistics-smoke        Smoke de GetMyPersonalStatisticsUseCase con fakes
  result-void <officialResultId> [--reason <text>] [--actor <id>] — Anular resultado aprobado
  results-smoke           Select → Confirm con fakes en memoria (@futrob/results)
  swiss-smoke             Torneo suizo con políticas puras: sin revanchas y bye con impares

Integración (requieren npm run dev; auth: FUTROB_INTERNAL_JOB_SECRET + --actor):
  api-health              GET /meta/health (estado API + DB)
  org-name-check <name>   Disponibilidad de nombre de organización
  org-create <name> [--slug s] [--time-zone tz]  Crea organización
  org-slug-check <slug> [--org id]  Disponibilidad de slug (con sugerencia)
  org-profile <orgId>     Perfil: nombre, slug, zona horaria y escudo
  org-mine                Lista membresías del actor
  org-invite <orgId> <email> [--role role]
  onboarding-status       Estado de onboarding del actor
  comp-create <orgId> <name>
  comp-list <orgId>
  comp-show <orgId> <compId>
  comp-publish <orgId> <compId>
  comp-registration-open <orgId> <compId>
  comp-registration-close <orgId> <compId>
  comp-explore [--q name] [--format league] [--status published]
  comp-explore-show <competitionId>
  comp-apply <competitionId> <teamName> [--key creationKey]
  comp-application <competitionId>
  comp-invite-team <orgId> <compId> <actorId> <label> [--message text]
  comp-invite-link <orgId> <compId> [--regenerate]
  entry-invite-accept <teamName> (--id invitationId | --code code) [--key creationKey]
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
  fixture-generate <orgId> <compId> [--starts-at ISO] [--interval-days 7] [--rounds N]
  swiss-withdraw <orgId> <compId> <fixturePlanId> <teamId> --reason "<motivo>" [--request-id ID]
  swiss-close-round <orgId> <compId> <fixturePlanId> <round> --reason "<motivo>" [--request-id ID]
  fixture-current <orgId> <compId>
  fixture-show <orgId> <compId> <fixturePlanId>
  snapshot-set <encounterId> <orgId> <compId> <homeTeamId> <awayTeamId> <startISO> [--slots 1|2]
  club-search <query>
  club-get <externalClubId>
  club-matches <externalClubId>
  sync-job-enqueue <orgId> <clubId> [--platform playstation] [--edition fc27] [--match-type club_match] [--max 10]
  sync-job-run <jobId>
  sync-job-run-next
  provider-health [providerKey]
  plans                   Catálogo público de planes
  org-plan <orgId>        Plan efectivo, uso y cupo de sync del mes
  org-entitlements <orgId>
  org-plan-assign <orgId> <free|pro|league> --reason "..." [--status s] [--trial-ends ISO]
  billing-smoke --superuser ID   Gratis → cupo agotado, dedupe, 2.ª competición → Pro
  player-me
  my-stats
  my-matches
  my-next-encounter
  sanction-list <orgId> <compId> [--team <teamId>]
  audit-list <orgId> [--competition id] [--by-actor id] [--action code] [--from ISO] [--to ISO] [--cursor cursor] [--limit 25]
  audit-smoke <orgId> --outsider <actorId> [--competition id]
                          Auditoría paginada, filtros, aislamiento y outsider 403
  sanctions-smoke <orgId> <compId> <teamId> --outsider <actorId> [--points 3]
                          Outsider 403, descuento en la tabla, revocar la restaura
  e2e-golden-path         Org → comp → team → entry → publish → fixture (smoke completo)
                          [--format league|swiss] [--superuser <id>] (suizo exige plan Pro)

Flags comunes: --json, --base-url URL, --actor ID
Env: FUTROB_API_BASE_URL, FUTROB_ACTOR_ID, FUTROB_ACCESS_TOKEN | FUTROB_INTERNAL_JOB_SECRET

Guía: apps/cli/README.md
`;
