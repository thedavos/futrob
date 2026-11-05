import type { DemoAccount } from "./accounts.ts";
import type { SeedContext } from "./context.ts";
import {
  commandKey,
  createConfiguredDraft,
  createTeam,
  enrollTeams,
  HOURS,
  limaEvening,
  matchRules,
  publishWithFixture,
  type OrgHandle,
  type PlayerRecord,
  type TeamHandle,
} from "./engine.ts";
import { seededRandom } from "./fake-ea.ts";
import { GAME_EDITION, GAME_PLATFORM, type People } from "./people.ts";
import { buildCompetition, closeCompetition, playAllRounds } from "./rounds.ts";

const DAY_MS = 24 * HOURS;

type OnboardPlayer = (
  account: DemoAccount,
  options: { gamertag?: string; clubId?: string },
) => Promise<PlayerRecord>;

const BARRIO_TEAMS = [
  "Los Pibes del Parque",
  "Juventud Esquina",
  "Unión Vecinal",
  "Deportivo Mercado",
  "Estrella del Pasaje",
  "Atlético Cancha 5",
  "Real Callejón",
  "Sporting Plaza",
  "Racing Azotea",
  "Defensores del Barrio",
  "Club La Bodega",
  "Fénix Barrial",
] as const;

/** Barrio FC: Free plan at every limit (1 competition, 12 teams, sync quota spent). */
export async function seedBarrioFc(
  context: SeedContext,
  people: People,
  onboardPlayer: OnboardPlayer,
): Promise<OrgHandle> {
  context.log("• Barrio FC (plan Free al límite)");
  const random = seededRandom(11);
  const organizer = people.named.orgFree;
  const onboarding = await context.as(organizer).identity.completeOrganizationOnboarding({
    name: "Barrio FC",
    competition: {
      name: "Liga Barrio",
      format: "league",
      gameEdition: GAME_EDITION,
      platform: GAME_PLATFORM,
      region: "south-america",
      timeZone: "America/Lima",
    },
    gameAccount: null,
  });
  const org: OrgHandle = { id: onboarding.organizationId, name: "Barrio FC", organizer };
  await context.as(people.named.superadmin).billing.assignOrganizationPlan(org.id, {
    planKey: "free",
    state: { status: "active" },
    reason: "Demo: Barrio FC en plan Free",
  });

  const teams: TeamHandle[] = [];
  const rosters: PlayerRecord[] = [];
  for (const [index, name] of BARRIO_TEAMS.entries()) {
    const captain = people.barrio[index]!;
    const club = context.ea.addClub({
      number: 101 + index,
      name,
      squad: [
        { gamertag: people.gamertagOf(captain), position: "forward" },
        { gamertag: `Vecino_${index + 1}A`, position: "midfielder" },
        { gamertag: `Vecino_${index + 1}B`, position: "defender" },
        { gamertag: `Arquero_${index + 1}`, position: "goalkeeper" },
      ],
    });
    rosters.push(
      await onboardPlayer(captain, { gamertag: people.gamertagOf(captain), clubId: club.clubId }),
    );
    teams.push(await createTeam(context, org, name, club.clubId));
  }

  const liga = await buildCompetition(context, {
    org,
    name: "Liga Barrio",
    format: "league",
    cover: "classic",
    teams,
    rosters: rosters.map((player) => [{ player, role: "captain" as const }]),
    regular: matchRules(),
    knockout: null,
    startsAt: limaEvening(context, -12, 21),
    fixture: { roundIntervalDays: 7 },
    maxTeams: 12,
    existingCompetitionId: onboarding.competition.competition.id,
  });
  await playAllRounds(context, liga, random, () => "official");

  // Spend the rest of the monthly sync allowance (60 on Free).
  const used = await context.pool.query<{ count: string }>(
    `SELECT count(*) FROM billing_quota_consumptions
     WHERE organization_id = $1 AND quota_key = 'provider_sync_jobs' AND period_key = $2`,
    [org.id, periodKey(context.now)],
  );
  const remaining = Math.max(0, 60 - Number(used.rows[0]?.count ?? 0));
  for (let index = 0; index < remaining; index += 1) {
    await context.pool.query(
      `INSERT INTO billing_quota_consumptions (organization_id, quota_key, usage_key, period_key, consumed_at)
       VALUES ($1, 'provider_sync_jobs', $2, $3, $4)`,
      [org.id, `demo-quota-fill-${index}`, periodKey(context.now), context.now],
    );
  }
  return org;
}

function periodKey(at: Date): string {
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MEGA_CITIES = [
  "Arequipa",
  "Cusco",
  "Trujillo",
  "Piura",
  "Iquitos",
  "Chiclayo",
  "Huancayo",
  "Tacna",
  "Puno",
  "Ica",
  "Ayacucho",
  "Cajamarca",
  "Huánuco",
  "Tumbes",
  "Moquegua",
  "Huaraz",
  "Pucallpa",
  "Juliaca",
  "Chimbote",
  "Sullana",
  "Tarapoto",
  "Jaén",
  "Abancay",
  "Barranca",
  "Huacho",
  "Talara",
  "Paita",
  "Ilo",
  "Nazca",
  "Pisco",
  "Chincha",
  "Tingo María",
  "Yurimaguas",
  "Bagua",
  "Andahuaylas",
  "Quillabamba",
] as const;

/** Mega Liga: League plan, 36 teams in registration and a paused competition. */
export async function seedMegaLiga(context: SeedContext, people: People): Promise<OrgHandle> {
  context.log("• Mega Liga (plan Liga, 36 equipos)");
  const organizer = people.named.orgLiga;
  const onboarding = await context.as(organizer).identity.completeOrganizationOnboarding({
    name: "Mega Liga",
    // Free until the League plan below: the draft starts as a league and changes format.
    competition: {
      name: "Superliga",
      format: "league",
      gameEdition: GAME_EDITION,
      platform: GAME_PLATFORM,
      region: "south-america",
      timeZone: "America/Lima",
    },
    gameAccount: null,
  });
  const org: OrgHandle = { id: onboarding.organizationId, name: "Mega Liga", organizer };
  await context.as(people.named.superadmin).billing.assignOrganizationPlan(org.id, {
    planKey: "league",
    state: { status: "active" },
    reason: "Demo: Mega Liga en plan Liga",
  });

  const teams: TeamHandle[] = [];
  for (const city of MEGA_CITIES) {
    teams.push(await createTeam(context, org, `Deportivo ${city}`, null));
  }
  const superligaId = await createConfiguredDraft(context, {
    org,
    name: "Superliga",
    format: "groups-knockout",
    cover: "supercup",
    maxTeams: 40,
    regularStage: matchRules({ officialMatchesPerEncounter: 2, resolutionMode: "aggregate_score" }),
    knockoutStage: matchRules({
      officialMatchesPerEncounter: 2,
      resolutionMode: "aggregate_score",
    }),
    startsOn: new Date(context.now.getTime() + 14 * DAY_MS),
    endsOn: new Date(context.now.getTime() + 120 * DAY_MS),
    existingCompetitionId: onboarding.competition.competition.id,
  });
  await context.as(organizer).competitions.openRegistration(org.id, superligaId);
  await enrollTeams(
    context,
    org,
    superligaId,
    teams.map((team, index) => ({
      team,
      roster: [],
      decision: index < 30 ? "approve" : index < 34 ? "pending" : "reject",
    })),
  );

  context.log("• Liga Pausada (Mega Liga)");
  const pausadaId = await createConfiguredDraft(context, {
    org,
    name: "Liga Pausada",
    format: "league",
    cover: "classic",
    maxTeams: 4,
    regularStage: matchRules(),
    knockoutStage: null,
    startsOn: new Date(context.now.getTime() + 3 * DAY_MS),
    endsOn: null,
  });
  await enrollTeams(
    context,
    org,
    pausadaId,
    teams.slice(0, 4).map((team) => ({ team, roster: [] })),
  );
  await publishWithFixture(context, org, pausadaId, {
    startsAt: limaEvening(context, 3),
    roundIntervalDays: 7,
  });
  await closeCompetition(context, pausadaId, "paused");
  return org;
}

/** Club Multi: multi-rol's own organization, on a Pro trial. */
export async function seedClubMulti(context: SeedContext, people: People): Promise<OrgHandle> {
  context.log("• Club Multi (Pro en prueba)");
  const organizer = people.named.multiRol;
  const client = context.as(organizer);
  const created = await client.organizations.create({
    name: "Club Multi",
    timeZone: "America/Lima",
    creationKey: commandKey("org"),
  });
  const org: OrgHandle = { id: created.organizationId, name: "Club Multi", organizer };
  await context.as(people.named.superadmin).billing.assignOrganizationPlan(org.id, {
    planKey: "pro",
    state: {
      status: "trialing",
      trialEndsAt: new Date(context.now.getTime() + 10 * DAY_MS).toISOString(),
    },
    reason: "Demo: prueba de Pro",
  });
  await createConfiguredDraft(context, {
    org,
    name: "Copa Amigos",
    format: "knockout",
    cover: "cup",
    maxTeams: 8,
    regularStage: null,
    knockoutStage: matchRules(),
    startsOn: new Date(context.now.getTime() + 20 * DAY_MS),
    endsOn: null,
  });
  return org;
}
