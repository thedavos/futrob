import type { DemoAccount } from "./accounts.ts";
import type { SeedContext } from "./context.ts";
import {
  commandKey,
  COMPETITION_TIME_ZONE,
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
import type { People } from "./people.ts";
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

/** Onboards the organizer into a new organization and puts it on its demo plan. */
export async function openOrganization(
  context: SeedContext,
  people: People,
  input: {
    readonly organizer: DemoAccount;
    readonly name: string;
    readonly planKey: "free" | "league";
    readonly reason: string;
  },
): Promise<OrgHandle> {
  const { organizer, name, planKey, reason } = input;
  const { organizationId } = await context.as(organizer).identity.completeOrganizationOnboarding({
    name,
    timeZone: COMPETITION_TIME_ZONE,
    gameAccount: null,
  });
  await context.as(people.named.superadmin).billing.assignOrganizationPlan(organizationId, {
    planKey,
    state: { status: "active" },
    reason,
  });
  return { id: organizationId, name, organizer };
}

/** Barrio FC: Free plan at every limit (1 competition, 12 teams, sync quota spent). */
export async function seedBarrioFc(
  context: SeedContext,
  people: People,
  onboardPlayer: OnboardPlayer,
): Promise<OrgHandle> {
  context.log("• Barrio FC (plan Free al límite)");
  const random = seededRandom(11);
  const org = await openOrganization(context, people, {
    organizer: people.named.orgFree,
    name: "Barrio FC",
    planKey: "free",
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
  const org = await openOrganization(context, people, {
    organizer,
    name: "Mega Liga",
    planKey: "league",
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
