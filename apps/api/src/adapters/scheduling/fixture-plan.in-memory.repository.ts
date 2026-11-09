import {
  replaceEncounter,
  withoutRounds,
  withRoundEncounters,
  type FixturePlan,
  type FixturePlanRepository,
} from "@futrob/scheduling";
import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import { versionKey } from "./fixture-plan-rows.ts";

export class InMemoryFixturePlanRepository implements FixturePlanRepository {
  readonly rows = new Map<string, FixturePlan>();
  private readonly generationVersions = new Map<string, string>();

  async findByGenerationVersion(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    generationVersion: number,
  ): Promise<FixturePlan | null> {
    const id = this.generationVersions.get(
      versionKey(organizationId, competitionId, generationVersion),
    );
    return id ? (this.rows.get(id) ?? null) : null;
  }

  async findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    fixturePlanId: string,
  ): Promise<FixturePlan | null> {
    const plan = this.rows.get(fixturePlanId) ?? null;
    return plan?.organizationId === organizationId && plan.competitionId === competitionId
      ? plan
      : null;
  }

  async listActive(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<FixturePlan[]> {
    return [...this.rows.values()].filter(
      (plan) =>
        plan.organizationId === organizationId &&
        plan.competitionId === competitionId &&
        plan.status === "active",
    );
  }

  async containsEncounter(
    input: Parameters<FixturePlanRepository["containsEncounter"]>[0],
  ): Promise<boolean> {
    for (const plan of this.rows.values()) {
      if (
        plan.organizationId !== input.organizationId ||
        plan.competitionId !== input.competitionId
      ) {
        continue;
      }
      if (
        plan.stages.some((stage) =>
          stage.rounds.some((round) =>
            round.encounters.some((encounter) => encounter.id === input.encounterId),
          ),
        )
      ) {
        return true;
      }
    }
    return false;
  }

  async save(
    plan: FixturePlan,
  ): Promise<{ readonly plan: FixturePlan; readonly created: boolean }> {
    const key = versionKey(plan.organizationId, plan.competitionId, plan.generationVersion);
    const existingId = this.generationVersions.get(key);
    if (existingId) {
      const existing = this.rows.get(existingId);
      if (!existing) throw new Error("Fixture generation version mapped to missing plan");
      return { plan: existing, created: false };
    }
    this.rows.set(plan.id, plan);
    this.generationVersions.set(key, plan.id);
    return { plan, created: true };
  }

  async updateEncounter(
    input: Parameters<FixturePlanRepository["updateEncounter"]>[0],
  ): Promise<FixturePlan | null> {
    const existing = await this.findById(
      input.organizationId,
      input.competitionId,
      input.fixturePlanId,
    );
    if (!existing || existing.revision !== input.revision) return null;
    const updated = {
      ...replaceEncounter(existing, input.encounter),
      revision: existing.revision + 1,
    };
    this.rows.set(updated.id, updated);
    return updated;
  }

  private async write(
    input: {
      readonly organizationId: OrganizationId;
      readonly competitionId: CompetitionId;
      readonly fixturePlanId: string;
      readonly revision: number;
    },
    change: (plan: FixturePlan) => FixturePlan,
  ): Promise<FixturePlan | null> {
    const existing = await this.findById(
      input.organizationId,
      input.competitionId,
      input.fixturePlanId,
    );
    if (!existing || existing.revision !== input.revision) return null;
    const updated = { ...change(existing), revision: existing.revision + 1 };
    this.rows.set(updated.id, updated);
    return updated;
  }

  replaceRoundEncounters(
    input: Parameters<FixturePlanRepository["replaceRoundEncounters"]>[0],
  ): Promise<FixturePlan | null> {
    return this.write(input, (plan) => withRoundEncounters(plan, input.roundId, input.encounters));
  }

  removeRounds(
    input: Parameters<FixturePlanRepository["removeRounds"]>[0],
  ): Promise<FixturePlan | null> {
    return this.write(input, (plan) => withoutRounds(plan, input.roundIds));
  }

  setWithdrawnTeams(
    input: Parameters<FixturePlanRepository["setWithdrawnTeams"]>[0],
  ): Promise<FixturePlan | null> {
    return this.write(input, (plan) => ({ ...plan, withdrawnTeamIds: input.teamIds }));
  }

  async markSuperseded(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    exceptPlanId: string,
  ): Promise<void> {
    for (const [id, plan] of this.rows) {
      if (
        plan.organizationId !== organizationId ||
        plan.competitionId !== competitionId ||
        plan.id === exceptPlanId ||
        plan.status !== "active"
      ) {
        continue;
      }
      this.rows.set(id, { ...plan, status: "superseded" });
    }
  }
}
