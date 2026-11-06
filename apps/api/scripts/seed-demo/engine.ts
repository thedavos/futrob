import type {
  CompetitionDraftInputDto,
  CompetitionMatchRulesDto,
  FixtureEncounterDto,
  FixturePlanDto,
} from "@futrob/api-contracts";
import type { DemoAccount } from "./accounts.ts";
import { attempt, type SeedContext } from "./context.ts";
import type { DemoMatch, DemoMatchType } from "./fake-ea.ts";
import { EA_PLATFORM, GAME_EDITION, GAME_PLATFORM } from "./people.ts";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
export const COMPETITION_TIME_ZONE = "America/Lima";
/** Lima has no daylight saving time: wall time is always UTC−5. */
const LIMA_OFFSET_HOURS = -5;

export interface PlayerRecord {
  readonly account: DemoAccount;
  readonly profileId: string;
  readonly gameAccountId: string | null;
}

export interface TeamHandle {
  readonly id: string;
  readonly name: string;
  readonly clubId: string | null;
}

export interface RosterSlot {
  readonly player: PlayerRecord;
  readonly role: "captain" | "vice_captain" | "player";
}

export interface OrgHandle {
  readonly id: string;
  readonly name: string;
  readonly organizer: DemoAccount;
}

export interface CompetitionHandle {
  readonly org: OrgHandle;
  readonly id: string;
  readonly name: string;
  /** Team id → the captain who speaks for it. */
  readonly captains: Map<string, DemoAccount>;
  readonly teams: readonly TeamHandle[];
}

/** One encounter of the fixture, with both participants already known. */
export interface PlayableEncounter {
  readonly id: string;
  readonly stageKind: FixturePlanDto["stages"][number]["kind"];
  readonly roundNumber: number;
  readonly kickoff: Date;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly officialMatchCount: 1 | 2;
}

export function matchRules(
  overrides: Partial<CompetitionMatchRulesDto> = {},
): CompetitionMatchRulesDto {
  return {
    officialMatchesPerEncounter: 1,
    resolutionMode: "independent_matches",
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowRescheduling: true,
    maxReschedulesPerTeam: 3,
    minimumRescheduleNoticeHours: 24,
    rescheduleProposalExpiryHours: 12,
    rescheduleRequiresOpponentApproval: true,
    rescheduleRequiresOrganizerApproval: false,
    ...overrides,
  };
}

export function draftInput(
  input: Pick<CompetitionDraftInputDto, "name" | "format"> & Partial<CompetitionDraftInputDto>,
): CompetitionDraftInputDto {
  return {
    gameEdition: GAME_EDITION,
    platform: GAME_PLATFORM,
    region: "south-america",
    timeZone: COMPETITION_TIME_ZONE,
    ...input,
  };
}

/** Competition wall time in Lima for a UTC instant. */
export function limaWallTime(at: Date) {
  const wall = new Date(at.getTime() + LIMA_OFFSET_HOURS * HOUR_MS);
  return {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    hour: wall.getUTCHours(),
    minute: wall.getUTCMinutes(),
    second: 0,
  };
}

/** A UTC instant whose Lima wall time is `hour`:00, `days` from the seed start. */
export function limaEvening(context: SeedContext, days: number, hour = 20): Date {
  const date = context.daysFromNow(days);
  date.setUTCHours(hour - LIMA_OFFSET_HOURS, 0, 0, 0);
  return date;
}

let commandSequence = 0;
export function commandKey(label: string): string {
  commandSequence += 1;
  return `demo-${label}-${Date.now().toString(36)}-${commandSequence}`;
}

// ── Players ─────────────────────────────────────────────────────────────────

export async function onboardPlayer(
  context: SeedContext,
  account: DemoAccount,
  options: { readonly gamertag?: string; readonly clubId?: string } = {},
): Promise<PlayerRecord> {
  const completed = await context.as(account).identity.completePlayerOnboarding({
    gameAccount: options.gamertag
      ? { identifier: options.gamertag, platform: GAME_PLATFORM, gameEdition: GAME_EDITION }
      : null,
    externalClub: options.clubId
      ? {
          providerKey: "ea-clubs",
          externalClubId: options.clubId,
          platform: EA_PLATFORM,
          gameEdition: GAME_EDITION,
        }
      : null,
  });
  if (options.clubId && completed.externalClubAssociation !== "associated") {
    context.warn(`${account.email}: club ${options.clubId} → ${completed.externalClubAssociation}`);
  }
  return {
    account,
    profileId: completed.profile.id,
    gameAccountId: completed.gameAccount?.id ?? null,
  };
}

// ── Organizations, teams and competitions ──────────────────────────────────

export async function createTeam(
  context: SeedContext,
  org: OrgHandle,
  name: string,
  clubId: string | null,
): Promise<TeamHandle> {
  const team = await context.as(org.organizer).teams.createTeam(org.id, {
    name,
    creationKey: commandKey("team"),
  });
  return { id: team.id, name, clubId };
}

export interface CompetitionSetup {
  readonly org: OrgHandle;
  readonly name: string;
  readonly format: CompetitionDraftInputDto["format"];
  readonly cover: "cup" | "classic" | "groups" | "league" | "lightning" | "playoffs" | "supercup";
  readonly maxTeams: number | null;
  readonly regularStage: CompetitionMatchRulesDto | null;
  readonly knockoutStage: CompetitionMatchRulesDto | null;
  readonly startsOn: Date | null;
  readonly endsOn: Date | null;
}

function calendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function createConfiguredDraft(
  context: SeedContext,
  setup: CompetitionSetup,
): Promise<string> {
  const client = context.as(setup.org.organizer);
  const draft = draftInput({
    name: setup.name,
    format: setup.format,
    teams: { min: 2, max: setup.maxTeams },
    schedule: {
      startsOn: setup.startsOn ? calendarDate(setup.startsOn) : null,
      endsOn: setup.endsOn ? calendarDate(setup.endsOn) : null,
    },
    cover: { kind: "preset", preset: setup.cover },
  });
  const {
    competition: { id: competitionId },
  } = await client.competitions.createDraft(setup.org.id, {
    ...draft,
    creationKey: commandKey("c"),
  });
  await client.competitions.updateDraft(setup.org.id, competitionId, {
    ...draft,
    rules: {
      regularStage: setup.regularStage,
      knockoutStage: setup.knockoutStage,
      maxRosterSize: 12,
    },
  });
  return competitionId;
}

/** Registers and approves the teams, fills rosters and connects EA clubs. */
export async function enrollTeams(
  context: SeedContext,
  org: OrgHandle,
  competitionId: string,
  enrollments: ReadonlyArray<{
    readonly team: TeamHandle;
    readonly roster: readonly RosterSlot[];
    readonly decision?: "approve" | "reject" | "pending";
  }>,
): Promise<Map<string, DemoAccount>> {
  const client = context.as(org.organizer);
  const captains = new Map<string, DemoAccount>();
  for (const { team, roster, decision = "approve" } of enrollments) {
    const entry = await client.competitions.registerTeamEntry(org.id, competitionId, {
      teamId: team.id,
    });
    if (decision === "approve") {
      await client.competitions.approveTeamEntry(org.id, competitionId, entry.id);
    } else if (decision === "reject") {
      await client.competitions.rejectTeamEntry(org.id, competitionId, entry.id);
      continue;
    } else {
      continue;
    }
    for (const slot of roster) {
      await attempt(context, `roster ${team.name} ← ${slot.player.account.email}`, () =>
        client.teams.addToRoster(org.id, competitionId, team.id, {
          playerProfileId: slot.player.profileId,
          gameAccountId: slot.player.gameAccountId,
          role: slot.role,
        }),
      );
      if (slot.role === "captain") captains.set(team.id, slot.player.account);
    }
    if (team.clubId) {
      const club = context.ea.club(team.clubId);
      await client.teams.connectExternalClub(org.id, competitionId, team.id, {
        providerKey: "ea-clubs",
        externalClubId: club.clubId,
        externalClubName: club.name,
        platform: EA_PLATFORM,
        gameEdition: GAME_EDITION,
      });
    }
  }
  return captains;
}

export async function publishWithFixture(
  context: SeedContext,
  org: OrgHandle,
  competitionId: string,
  fixture: {
    readonly startsAt: Date;
    readonly roundIntervalDays: number;
    readonly seed?: readonly string[];
    readonly groups?: { readonly count: number; readonly qualifiersPerGroup: number };
    readonly playoffs?: { readonly teamCount: number };
  },
): Promise<FixturePlanDto> {
  const client = context.as(org.organizer);
  await client.competitions.publish(org.id, competitionId);
  return client.encounters.generateFixture(org.id, competitionId, {
    generationVersion: 1,
    startsAt: fixture.startsAt.toISOString(),
    roundIntervalDays: fixture.roundIntervalDays,
    homeAndAway: false,
    seed: fixture.seed ? [...fixture.seed] : undefined,
    groups: fixture.groups,
    playoffs: fixture.playoffs,
  });
}

/** Rounds of the current fixture in kickoff order, keeping only encounters with both Teams. */
export async function currentRounds(
  context: SeedContext,
  competition: CompetitionHandle,
): Promise<Array<{ readonly kickoff: Date; readonly encounters: PlayableEncounter[] }>> {
  const current = await context
    .as(competition.org.organizer)
    .encounters.getCurrentFixture(competition.org.id, competition.id);
  if (!current.fixture) return [];
  const rounds = current.fixture.stages.flatMap((stage) =>
    stage.rounds.map((round) => ({
      kickoff: new Date(round.scheduledStartAt),
      encounters: round.encounters.flatMap((encounter) =>
        playable(stage.kind, round.number, encounter),
      ),
    })),
  );
  return rounds.sort((left, right) => left.kickoff.getTime() - right.kickoff.getTime());
}

function playable(
  stageKind: PlayableEncounter["stageKind"],
  roundNumber: number,
  encounter: FixtureEncounterDto,
): PlayableEncounter[] {
  if (encounter.home.kind !== "team" || encounter.away.kind !== "team") return [];
  return [
    {
      id: encounter.id,
      stageKind,
      roundNumber,
      kickoff: new Date(encounter.scheduledStartAt),
      homeTeamId: encounter.home.teamId,
      awayTeamId: encounter.away.teamId,
      officialMatchCount: encounter.officialMatchCount,
    },
  ];
}

// ── EA data ──────────────────────────────────────────────────────────────────

export function matchTypeFor(encounter: PlayableEncounter): DemoMatchType {
  return encounter.stageKind === "knockout" || encounter.stageKind === "playoffs"
    ? "playoffMatch"
    : "leagueMatch";
}

/**
 * Creates the EA matches the two clubs played around kickoff: the official ones plus
 * `extra` friendlies or rematches that the captains must leave out.
 */
export function playMatches(
  context: SeedContext,
  competition: CompetitionHandle,
  encounter: PlayableEncounter,
  options: {
    readonly scores?: ReadonlyArray<readonly [number, number]>;
    readonly extra?: number;
    readonly random: () => number;
  },
): DemoMatch[] {
  const home = competition.teams.find((team) => team.id === encounter.homeTeamId);
  const away = competition.teams.find((team) => team.id === encounter.awayTeamId);
  if (!home?.clubId || !away?.clubId) return [];
  const goals = () => Math.floor(options.random() * options.random() * 5);
  const matches: DemoMatch[] = [];
  const total = encounter.officialMatchCount + (options.extra ?? 0);
  for (let index = 0; index < total; index += 1) {
    const score = options.scores?.[index] ?? [goals(), goals()];
    const isExtra = index >= encounter.officialMatchCount;
    matches.push(
      context.ea.addMatch({
        homeClubId: home.clubId,
        awayClubId: away.clubId,
        occurredAt: new Date(encounter.kickoff.getTime() + (12 + index * 38) * MINUTE_MS),
        homeGoals: score[0],
        awayGoals: score[1],
        matchType: isExtra && index % 2 === 1 ? "friendlyMatch" : matchTypeFor(encounter),
      }),
    );
  }
  return matches;
}

const clubLocks = new Map<string, Promise<unknown>>();

/** Serializes work per club: two syncs of one club would share a dedupe key. */
function withClubLock<T>(clubId: string, work: () => Promise<T>): Promise<T> {
  const previous = clubLocks.get(clubId) ?? Promise.resolve();
  const next = previous.then(work, work);
  clubLocks.set(
    clubId,
    next.catch(() => undefined),
  );
  return next;
}

/** Runs provider sync jobs through the real job pipeline, clubs in parallel. */
export async function syncClubs(
  context: SeedContext,
  organizationId: string,
  targets: ReadonlyArray<{ readonly clubId: string; readonly matchType: DemoMatchType }>,
): Promise<void> {
  const unique = new Map(targets.map((target) => [`${target.clubId}:${target.matchType}`, target]));
  const byClub = new Map<string, DemoMatchType[]>();
  for (const { clubId, matchType } of unique.values()) {
    byClub.set(clubId, [...(byClub.get(clubId) ?? []), matchType]);
  }
  await Promise.all(
    [...byClub].map(([clubId, matchTypes]) =>
      withClubLock(clubId, async () => {
        for (const matchType of matchTypes)
          await syncClub(context, organizationId, clubId, matchType);
      }),
    ),
  );
}

async function syncClub(
  context: SeedContext,
  organizationId: string,
  clubId: string,
  matchType: DemoMatchType,
): Promise<void> {
  const queued = await context.modules.gameData.enqueueProviderSyncJob.execute({
    organizationId,
    providerKey: "ea-clubs",
    requestId: commandKey("sync"),
    sync: {
      externalClubId: clubId,
      platform: EA_PLATFORM,
      gameEdition: GAME_EDITION,
      matchType,
      maxResultCount: 50,
    },
  });
  if (!queued.isOk()) {
    context.warn(`sync ${clubId}/${matchType}: ${queued.error.code}`);
    return;
  }
  const job = await context.modules.gameData.executeProviderSyncJob.execute(queued.value.id);
  if (job?.status !== "succeeded") {
    context.warn(`sync ${clubId}/${matchType}: job ${job?.status ?? "missing"}`);
  }
}

/** One sync per match type of each encounter's home club: one ingestion carries both sides. */
export function syncTargets(
  encounters: ReadonlyArray<{ readonly matches: readonly DemoMatch[] }>,
): Array<{ clubId: string; matchType: DemoMatchType }> {
  return encounters.flatMap(({ matches }) =>
    matches.map((match) => ({ clubId: match.home.clubId, matchType: match.matchType })),
  );
}

export const HOURS = HOUR_MS;
