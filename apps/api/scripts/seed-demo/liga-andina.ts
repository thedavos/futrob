import type { DemoAccount } from "./accounts.ts";
import type { SeedContext } from "./context.ts";
import {
  createConfiguredDraft,
  createTeam,
  enrollTeams,
  HOURS,
  limaEvening,
  matchRules,
  type CompetitionHandle,
  type OrgHandle,
  type PlayerRecord,
  type RosterSlot,
  type TeamHandle,
} from "./engine.ts";
import { seededRandom, type SquadMember } from "./fake-ea.ts";
import { openOrganization } from "./orgs.ts";
import type { People } from "./people.ts";
import { seedClausuraStories } from "./clausura.ts";
import { buildCompetition, closeCompetition, playAllRounds } from "./rounds.ts";

const DAY_MS = 24 * HOURS;

interface ClubSpec {
  readonly name: string;
  /** People of the club: the first one captains, `vice` is vice-captain. */
  readonly members: readonly DemoAccount[];
  readonly vice?: DemoAccount;
}

export interface LigaAndina {
  readonly org: OrgHandle;
  readonly teams: readonly TeamHandle[];
  readonly players: ReadonlyMap<string, PlayerRecord>;
  readonly clausura: CompetitionHandle;
  readonly apertura: { readonly id: string; readonly name: string };
  readonly competitionIds: {
    readonly verano: string;
    readonly archivo: string;
  };
}

function clubSpecs(people: People): ClubSpec[] {
  const squad = people.squad;
  const trio = (start: number) => squad.slice(start, start + 3);
  return [
    {
      name: "Cóndores FC",
      members: [people.named.capitanLocal, people.named.subcapitan, ...trio(0)],
      vice: people.named.subcapitan,
    },
    { name: "Atlético Pumas", members: [people.named.capitanVisita, ...trio(3)] },
    { name: "Real Vicuña", members: trio(6) },
    { name: "Deportivo Llama", members: trio(9) },
    { name: "Inti United", members: trio(12) },
    { name: "Sporting Quipu", members: trio(15) },
    { name: "Racing Totora", members: trio(18) },
    { name: "Unión Chasqui", members: [...trio(21), people.named.multiRol] },
  ];
}

const POSITIONS: ReadonlyArray<SquadMember["position"]> = [
  "forward",
  "midfielder",
  "midfielder",
  "defender",
  "forward",
];

/**
 * Liga Andina, the Pro organization the demo revolves around. Order matters: the Pro
 * plan allows 5 active competitions, so the finished and archived ones are closed before
 * the current season opens.
 */
export async function seedLigaAndina(
  context: SeedContext,
  people: People,
  onboardPlayer: (
    account: DemoAccount,
    options: { gamertag?: string; clubId?: string },
  ) => Promise<PlayerRecord>,
): Promise<LigaAndina> {
  const specs = clubSpecs(people);

  // EA clubs: the Futrob players plus two guests per club that have no Futrob account,
  // so statistics also show unmatched EA players.
  const clubs = specs.map((spec, index) =>
    context.ea.addClub({
      number: index + 1,
      name: spec.name,
      squad: [
        ...spec.members.map((member, memberIndex) => ({
          gamertag: people.gamertagOf(member),
          position: POSITIONS[memberIndex % POSITIONS.length]!,
        })),
        { gamertag: `Invitado_${index + 1}A`, position: "defender" as const },
        { gamertag: `Portero_${index + 1}`, position: "goalkeeper" as const },
      ],
    }),
  );

  context.log("• Liga Andina: jugadores");
  const players = new Map<string, PlayerRecord>();
  for (const [index, spec] of specs.entries()) {
    for (const member of spec.members) {
      if (players.has(member.actorId)) continue;
      players.set(
        member.actorId,
        await onboardPlayer(member, {
          gamertag: people.gamertagOf(member),
          clubId: clubs[index]!.clubId,
        }),
      );
    }
  }

  context.log("• Liga Andina: organización, plan Pro y staff");
  const organizer = people.named.orgPro;
  // Seeding runs competitions in parallel, which the Pro limit of 5 active competitions
  // would block. Liga Andina seeds on the League plan and moves to Pro at the end.
  const org = await openOrganization(context, people, {
    organizer,
    name: "Liga Andina",
    planKey: "league",
    reason: "Demo: carga inicial de Liga Andina",
  });
  // Unfinished draft: information and rules saved, no participants yet.
  await createConfiguredDraft(context, {
    org,
    name: "Copa Borrador",
    format: "league",
    cover: "cup",
    maxTeams: 16,
    regularStage: matchRules(),
    knockoutStage: null,
    startsOn: null,
    endsOn: null,
  });

  const teams: TeamHandle[] = [];
  for (const [index, spec] of specs.entries()) {
    teams.push(await createTeam(context, org, spec.name, clubs[index]!.clubId));
  }
  const rosterOf = (teamIndex: number, captain?: DemoAccount): RosterSlot[] => {
    const spec = specs[teamIndex]!;
    const lead = captain ?? spec.members[0]!;
    return spec.members
      .filter((member) => !(teamIndex === 7 && member === people.named.multiRol && lead !== member))
      .map((member) => ({
        player: players.get(member.actorId)!,
        role: member === lead ? "captain" : member === spec.vice ? "vice_captain" : "player",
      }));
  };

  const seedVerano = async () => {
    context.log("• Torneo Verano 25 (liga + playoffs, finalizado)");
    const verano = await buildCompetition(context, {
      org,
      name: "Torneo Verano 25",
      format: "league-playoffs",
      cover: "playoffs",
      teams: teams.slice(0, 6),
      rosters: [0, 1, 2, 3, 4, 5].map((index) => rosterOf(index)),
      regular: matchRules(),
      knockout: matchRules({ allowRescheduling: false }),
      startsAt: limaEvening(context, -150),
      fixture: { roundIntervalDays: 7, playoffs: { teamCount: 4 } },
    });
    await playAllRounds(context, verano, seededRandom(21), () => "official");
    await closeCompetition(context, verano.id, "finished");
    return verano;
  };

  const seedArchivo = async () => {
    context.log("• Archivo 24 (liga archivada)");
    const archivo = await buildCompetition(context, {
      org,
      name: "Archivo 24",
      format: "league",
      cover: "classic",
      teams: teams.slice(4, 8),
      rosters: [4, 5, 6, 7].map((index) => rosterOf(index)),
      regular: matchRules(),
      knockout: null,
      startsAt: limaEvening(context, -300),
      fixture: { roundIntervalDays: 7 },
    });
    await playAllRounds(context, archivo, seededRandom(24), () => "official");
    await closeCompetition(context, archivo.id, "archived");
    return archivo;
  };

  // Clausura 26: the season in progress, every encounter state.
  const seedClausura = async () => {
    context.log("• Clausura 26 (liga en curso, 2 partidos oficiales con marcador agregado)");
    const clausura = await buildCompetition(context, {
      org,
      name: "Clausura 26",
      format: "league",
      cover: "league",
      teams,
      rosters: teams.map((_, index) => rosterOf(index)),
      regular: matchRules({ officialMatchesPerEncounter: 2, resolutionMode: "aggregate_score" }),
      knockout: null,
      startsAt: limaEvening(context, -30),
      fixture: { roundIntervalDays: 7 },
      maxTeams: 8,
    });
    await seedClausuraStories(context, clausura, seededRandom(26));
    return clausura;
  };

  // Copa Relámpago: knockout with a tie waiting for the organizer.
  const seedRelampago = async () => {
    context.log("• Copa Relámpago (eliminación directa)");
    const relampago = await buildCompetition(context, {
      org,
      name: "Copa Relámpago",
      format: "knockout",
      cover: "lightning",
      teams,
      rosters: teams.map((_, index) => rosterOf(index)),
      regular: null,
      knockout: matchRules(),
      startsAt: limaEvening(context, -6, 21),
      fixture: { roundIntervalDays: 7 },
    });
    let tieCreated = false;
    await playAllRounds(context, relampago, seededRandom(31), (encounter) => {
      if (encounter.kickoff.getTime() > context.now.getTime()) return "skip";
      if (!tieCreated) {
        tieCreated = true;
        return "tie";
      }
      return "official";
    });
  };

  // Mundialito: groups + knockout; multi-rol captains Unión Chasqui.
  const seedMundialito = async () => {
    context.log("• Mundialito (grupos + eliminación)");
    const mundialito = await buildCompetition(context, {
      org,
      name: "Mundialito",
      format: "groups-knockout",
      cover: "groups",
      teams,
      rosters: teams.map((_, index) =>
        rosterOf(index, index === 7 ? people.named.multiRol : undefined),
      ),
      regular: matchRules(),
      knockout: matchRules(),
      startsAt: limaEvening(context, -25, 19),
      fixture: { roundIntervalDays: 7, groups: { count: 2, qualifiersPerGroup: 2 } },
    });
    await playAllRounds(context, mundialito, seededRandom(41), (encounter) =>
      encounter.kickoff.getTime() > context.now.getTime() ? "skip" : "official",
    );
  };

  const [verano, archivo, clausura] = await Promise.all([
    seedVerano(),
    seedArchivo(),
    seedClausura(),
    seedRelampago(),
    seedMundialito(),
  ]);

  // ── Apertura Inscripciones: registration open ─────────────────────────────
  context.log("• Apertura Inscripciones (inscripciones abiertas)");
  const halcones = await createTeam(context, org, "Halcones Sin Club", null);
  const halconesCaptain = await onboardPlayer(people.named.capitanSinEa, {
    gamertag: people.gamertagOf(people.named.capitanSinEa),
  });
  const aperturaId = await createConfiguredDraft(context, {
    org,
    name: "Apertura Inscripciones",
    format: "league",
    cover: "cup",
    maxTeams: 10,
    regularStage: matchRules({ officialMatchesPerEncounter: 2, resolutionMode: "aggregate_score" }),
    knockoutStage: null,
    startsOn: new Date(context.now.getTime() + 21 * DAY_MS),
    endsOn: new Date(context.now.getTime() + 90 * DAY_MS),
  });
  await context.as(organizer).competitions.openRegistration(org.id, aperturaId);
  await enrollTeams(context, org, aperturaId, [
    {
      team: halcones,
      roster: [{ player: halconesCaptain, role: "captain" }],
    },
    { team: teams[0]!, roster: rosterOf(0) },
    { team: teams[1]!, roster: rosterOf(1) },
    { team: teams[2]!, roster: [], decision: "pending" },
    { team: teams[4]!, roster: [], decision: "pending" },
    { team: teams[3]!, roster: [], decision: "reject" },
  ]);

  // 5 active competitions now (draft, registration and three in progress): the Pro limit.
  await context.as(people.named.superadmin).billing.assignOrganizationPlan(org.id, {
    planKey: "pro",
    state: { status: "active" },
    reason: "Demo: Liga Andina pasa a Pro",
  });

  return {
    org,
    teams,
    players,
    clausura,
    apertura: { id: aperturaId, name: "Apertura Inscripciones" },
    competitionIds: { verano: verano.id, archivo: archivo.id },
  };
}
