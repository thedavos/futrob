import { describe, expect, it, vi } from "vite-plus/test";
import type { CompetitionDraft, CompetitionRepository } from "@futrob/competitions";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { InMemoryCompetitionRepository } from "./in-memory.repository.ts";
import { PostgresCompetitionRepository } from "./postgres.repository.ts";

const draft: CompetitionDraft = {
  competition: {
    id: asCompetitionId("competition-1"),
    organizationId: asOrganizationId("org-1"),
    name: "Liga Futrob",
    status: "draft",
    modality: "fc-clubs",
    gameEdition: "FC 26",
    platform: "playstation",
    region: "south-america",
    timeZone: "America/Lima",
    format: "league",
    createdByActorId: asActorId("actor-1"),
    creationKey: "onboarding:competition:actor-1",
    createdAt: new Date("2026-07-31T12:00:00.000Z"),
    updatedAt: new Date("2026-07-31T12:00:00.000Z"),
  },
  rules: {
    competitionId: asCompetitionId("competition-1"),
    version: 1,
    regularStage: {
      officialMatchesPerEncounter: 1,
      resolutionMode: "independent_matches",
      winPoints: 3,
      drawPoints: 1,
      lossPoints: 0,
      allowRescheduling: true,
      maxReschedulesPerTeam: 2,
      minimumRescheduleNoticeHours: 12,
      rescheduleRequiresOpponentApproval: true,
      rescheduleRequiresOrganizerApproval: false,
    },
    knockoutStage: null,
    awayGoalsEnabled: false,
    createdAt: new Date("2026-07-31T12:00:00.000Z"),
  },
};

function repositoryCases(): Array<[string, () => CompetitionRepository]> {
  return [
    ["in-memory", () => new InMemoryCompetitionRepository()],
    [
      "Postgres",
      () => new PostgresCompetitionRepository(new FakeCompetitionPool() as unknown as Pool),
    ],
  ];
}

describe.each(repositoryCases())("competition %s repository", (_name, createRepository) => {
  it("saves and reads a draft within its organization", async () => {
    const repository = createRepository();
    await repository.saveDraft(draft);

    await expect(
      repository.findById(asOrganizationId("org-1"), asCompetitionId("competition-1")),
    ).resolves.toMatchObject({ competition: { name: "Liga Futrob" }, rules: { version: 1 } });
    await expect(
      repository.findById(asOrganizationId("org-other"), asCompetitionId("competition-1")),
    ).resolves.toBeNull();
    await expect(
      repository.findByCreationKey("onboarding:competition:actor-1"),
    ).resolves.toMatchObject({ competition: { id: "competition-1" } });
  });
});

describe("PostgresCompetitionRepository nested in TransactionPort", () => {
  it("joins the outer transaction instead of opening a second BEGIN", async () => {
    const fakePool = new FakeCompetitionPool();
    const connectSpy = vi.spyOn(fakePool, "connect");
    const pool = fakePool as unknown as Pool;
    const repository = new PostgresCompetitionRepository(pool);
    const transaction = new PostgresTransactionPort(pool);

    await transaction.runInTransaction(async () => {
      await repository.saveDraft(draft);
    });

    expect(connectSpy).toHaveBeenCalledOnce();
    await expect(
      repository.findByCreationKey("onboarding:competition:actor-1"),
    ).resolves.toMatchObject({ competition: { id: "competition-1" } });
  });
});

class FakeCompetitionPool {
  private competition: Record<string, unknown> | null = null;
  private rules: Record<string, unknown> | null = null;

  async connect() {
    return {
      query: (text: string, values?: readonly unknown[]) => this.query(text, values),
      release() {},
    };
  }

  async query(text: string, values: readonly unknown[] = []) {
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [] };
    if (text.includes("INSERT INTO competitions")) {
      this.competition = {
        id: values[0],
        organization_id: values[1],
        name: values[2],
        status: values[3],
        modality: values[4],
        game_edition: values[5],
        platform: values[6],
        region: values[7],
        time_zone: values[8],
        format: values[9],
        created_by_actor_id: values[10],
        creation_key: values[11],
        created_at: values[12],
        updated_at: values[13],
      };
      return { rows: [this.competition] };
    }
    if (text.includes("INSERT INTO competition_rules")) {
      this.rules = {
        competition_id: values[0],
        version: values[1],
        regular_stage: values[2],
        knockout_stage: values[3],
        away_goals_enabled: values[4],
        created_at: values[5],
      };
      return { rows: [this.rules] };
    }
    if (text.includes("SELECT c.*")) {
      if (!this.competition || !this.rules) return { rows: [] };
      const matches = text.includes("c.organization_id")
        ? values[0] === this.competition.organization_id && values[1] === this.competition.id
        : values[0] === this.competition.creation_key;
      return {
        rows: matches
          ? [
              {
                ...this.competition,
                rules_version: this.rules.version,
                regular_stage: this.rules.regular_stage,
                knockout_stage: this.rules.knockout_stage,
                away_goals_enabled: this.rules.away_goals_enabled,
                rules_created_at: this.rules.created_at,
              },
            ]
          : [],
      };
    }
    throw new Error(`Unexpected query: ${text}`);
  }
}
