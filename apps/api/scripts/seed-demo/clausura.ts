import { attempt, type SeedContext } from "./context.ts";
import {
  currentRounds,
  HOURS,
  playMatches,
  syncClubs,
  syncTargets,
  type CompetitionHandle,
  type PlayableEncounter,
} from "./engine.ts";
import {
  acceptReschedule,
  counterReschedule,
  expireConfirmation,
  expireDueScheduleChanges,
  openDispute,
  playOfficial,
  playWithAlternative,
  propose,
  requestReschedule,
  resolveDisputeApproving,
  reviewDispute,
  rivalOf,
  type StoryInput,
} from "./stories.ts";

const DAY_MS = 24 * HOURS;

// ── Clausura 26 ──────────────────────────────────────────────────────────────

type ClausuraStory =
  | "official"
  | "alternative"
  | "voided"
  | "candidates"
  | "dispute-open"
  | "dispute-review"
  | "dispute-resolved"
  | "expired"
  | "awaiting-confirmation"
  | "no-data";

/**
 * Rounds 1–3 are official, round 4 (9 days ago) and round 5 (2 days ago) hold every
 * selection state, and rounds 6–7 (next weeks) hold the schedule change negotiations.
 * Cóndores (capitan-local) and Pumas (capitan-visita) always get an actionable case.
 */
export async function seedClausuraStories(
  context: SeedContext,
  clausura: CompetitionHandle,
  random: () => number,
): Promise<void> {
  const condores = clausura.teams[0]!.id;
  const pumas = clausura.teams[1]!.id;
  const rounds = await currentRounds(context, clausura);
  const past = rounds.filter((round) => round.kickoff.getTime() < context.now.getTime());
  const future = rounds.filter((round) => round.kickoff.getTime() >= context.now.getTime());
  const involves = (encounter: PlayableEncounter, teamId: string) =>
    encounter.homeTeamId === teamId || encounter.awayTeamId === teamId;

  const storyPlan = new Map<string, ClausuraStory>();
  for (const [roundIndex, round] of past.entries()) {
    const others = round.encounters.filter(
      (encounter) => !involves(encounter, condores) && !involves(encounter, pumas),
    );
    const condoresEncounter = round.encounters.find((encounter) => involves(encounter, condores));
    const pumasEncounter = round.encounters.find(
      (encounter) => involves(encounter, pumas) && encounter !== condoresEncounter,
    );
    const isLast = roundIndex === past.length - 1;
    const isSecondLast = roundIndex === past.length - 2;
    for (const encounter of round.encounters) storyPlan.set(encounter.id, "official");
    if (roundIndex === 0 && others[0]) storyPlan.set(others[0].id, "alternative");
    if (roundIndex === 2 && others[0]) storyPlan.set(others[0].id, "voided");
    if (isSecondLast) {
      if (condoresEncounter) storyPlan.set(condoresEncounter.id, "candidates");
      if (pumasEncounter) storyPlan.set(pumasEncounter.id, "dispute-open");
      if (others[0]) storyPlan.set(others[0].id, "dispute-review");
      if (others[1]) storyPlan.set(others[1].id, "expired");
    }
    if (isLast) {
      if (condoresEncounter) storyPlan.set(condoresEncounter.id, "awaiting-confirmation");
      if (pumasEncounter) storyPlan.set(pumasEncounter.id, "awaiting-confirmation");
      if (others[0]) storyPlan.set(others[0].id, "no-data");
      if (others[1]) storyPlan.set(others[1].id, "dispute-resolved");
    }
  }

  for (const round of past) {
    const matches = new Map(
      round.encounters.map((encounter) => {
        const story = storyPlan.get(encounter.id)!;
        if (story === "no-data") return [encounter.id, []];
        const extra = story === "candidates" ? 3 : story === "alternative" ? 1 : 0;
        return [encounter.id, playMatches(context, clausura, encounter, { random, extra })];
      }),
    );
    await syncClubs(
      context,
      clausura.org.id,
      syncTargets([...matches.values()].map((encounterMatches) => ({ matches: encounterMatches }))),
    );
    for (const encounter of round.encounters) {
      const story = storyPlan.get(encounter.id)!;
      const input: StoryInput = {
        context,
        competition: clausura,
        encounter,
        matches: matches.get(encounter.id) ?? [],
      };
      await attempt(context, `Clausura ${encounter.id} (${story})`, () =>
        runClausuraStory(input, story, { condores, pumas }),
      );
    }
  }

  await seedClausuraReschedules(context, clausura, future, { condores, pumas });
}

async function runClausuraStory(
  input: StoryInput,
  story: ClausuraStory,
  teams: { readonly condores: string; readonly pumas: string },
): Promise<void> {
  const { context, encounter } = input;
  const kickoff = encounter.kickoff.getTime();
  const at = (hours: number) => new Date(kickoff + hours * HOURS);
  switch (story) {
    case "official":
      await playOfficial(input);
      return;
    case "alternative":
      await playWithAlternative(input);
      return;
    case "voided": {
      const confirmed = await playOfficial(input);
      const resultId = confirmed.approvedResult?.id;
      if (!resultId) throw new Error("expected an approved result to void");
      await context.clock.at(at(30), () =>
        context.as(input.competition.org.organizer).results.voidOfficialResult(resultId, {
          reason: "Alineación indebida comprobada: se anula el resultado.",
        }),
      );
      return;
    }
    case "candidates":
    case "no-data":
      return;
    case "dispute-open":
    case "dispute-review":
    case "dispute-resolved": {
      // Pumas always disputes, so its rival proposes.
      const proposer =
        story === "dispute-open" ? rivalOf(encounter, teams.pumas) : encounter.homeTeamId;
      const proposed = await propose(input, at(3), { teamId: proposer });
      const disputed = await openDispute(input, proposed, at(5));
      if (story === "dispute-open") return;
      const reviewed = await reviewDispute(input, disputed, at(20));
      if (story === "dispute-review") return;
      await resolveDisputeApproving(input, reviewed, proposed.proposal!.id, at(26));
      return;
    }
    case "expired":
      await expireConfirmation(input, at(2));
      return;
    case "awaiting-confirmation": {
      // Cóndores proposes and waits; when Pumas is the one to answer, its rival proposes.
      const involvesCondores =
        encounter.homeTeamId === teams.condores || encounter.awayTeamId === teams.condores;
      const proposer = involvesCondores ? teams.condores : rivalOf(encounter, teams.pumas);
      // 20 hours ago: the 24-hour confirmation window closes in about 4 hours.
      await propose(input, context.hoursAgo(20), { teamId: proposer });
      return;
    }
  }
}

async function seedClausuraReschedules(
  context: SeedContext,
  clausura: CompetitionHandle,
  future: ReadonlyArray<{ readonly kickoff: Date; readonly encounters: PlayableEncounter[] }>,
  teams: { readonly condores: string; readonly pumas: string },
): Promise<void> {
  const [next, later] = future;
  if (!next) return;
  const involves = (encounter: PlayableEncounter, teamId: string) =>
    encounter.homeTeamId === teamId || encounter.awayTeamId === teamId;
  const condoresEncounter = next.encounters.find((encounter) =>
    involves(encounter, teams.condores),
  );
  const pumasEncounter = next.encounters.find(
    (encounter) => involves(encounter, teams.pumas) && encounter !== condoresEncounter,
  );
  const others = next.encounters.filter(
    (encounter) => encounter !== condoresEncounter && encounter !== pumasEncounter,
  );
  const plusDay = (encounter: PlayableEncounter, days: number, hour = 21) => {
    const date = new Date(encounter.kickoff.getTime() + days * DAY_MS);
    date.setUTCHours(hour + 5, 0, 0, 0);
    return date;
  };

  if (condoresEncounter) {
    const input = { context, competition: clausura, encounter: condoresEncounter };
    await attempt(context, "Clausura: reprogramación abierta (Cóndores)", () =>
      requestReschedule(input, {
        at: context.hoursAgo(3),
        to: plusDay(condoresEncounter, 1),
        teamId: teams.condores,
        reason: "Dos titulares viajan ese día; proponemos jugar al día siguiente.",
      }),
    );
  }

  if (pumasEncounter) {
    const input = { context, competition: clausura, encounter: pumasEncounter };
    const rival = rivalOf(pumasEncounter, teams.pumas);
    await attempt(context, "Clausura: negociación con contrapropuestas (Pumas)", async () => {
      const opened = await requestReschedule(input, {
        at: context.hoursAgo(6),
        to: plusDay(pumasEncounter, 1),
        teamId: rival,
        reason: "Coincide con la final de otro torneo.",
      });
      const countered = await counterReschedule(input, opened, {
        at: context.hoursAgo(4),
        to: plusDay(pumasEncounter, 2, 22),
        teamId: teams.pumas,
        reason: "Ese día no completamos once; mejor dos días después.",
      });
      await counterReschedule(input, countered, {
        at: context.hoursAgo(1),
        to: plusDay(pumasEncounter, 2, 20),
        teamId: rival,
        reason: "Aceptamos el día, pero dos horas antes.",
      });
    });
  }

  const [applied, escalated] = others;
  if (applied) {
    const input = { context, competition: clausura, encounter: applied };
    await attempt(context, "Clausura: reprogramación aceptada y aplicada", async () => {
      const opened = await requestReschedule(input, {
        at: context.hoursAgo(10),
        to: plusDay(applied, 1),
        reason: "Corte de luz programado en la zona.",
      });
      await acceptReschedule(input, opened, {
        at: context.hoursAgo(8),
        teamId: applied.awayTeamId,
      });
    });
  }
  if (escalated) {
    const input = { context, competition: clausura, encounter: escalated };
    await attempt(context, "Clausura: reprogramación vencida y escalada", async () => {
      await requestReschedule(input, {
        at: context.hoursAgo(30),
        to: plusDay(escalated, 1),
        reason: "Problemas de conexión del servidor del club.",
      });
      await expireDueScheduleChanges(context, new Set([clausura.org.id]));
    });
  }

  const single = later?.encounters.find(
    (encounter) => !involves(encounter, teams.condores) && !involves(encounter, teams.pumas),
  );
  if (single) {
    const input = { context, competition: clausura, encounter: single };
    await attempt(context, "Clausura: reprogramación de un solo partido oficial", async () => {
      const opened = await requestReschedule(input, {
        at: context.hoursAgo(12),
        to: plusDay(single, 2),
        slot: 2,
        reason: "Solo el partido de vuelta: el portero titular no llega.",
      });
      await acceptReschedule(input, opened, {
        at: context.hoursAgo(11),
        teamId: single.awayTeamId,
      });
    });
  }
}
