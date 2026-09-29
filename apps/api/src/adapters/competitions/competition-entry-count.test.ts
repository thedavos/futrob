import { describe, expect, it, vi } from "vite-plus/test";
import { asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "@futrob/competitions";
import { asPgPool } from "@/adapters/persistence/pg-test-double.ts";
import {
  InMemoryCompetitionEntryRepository,
  PostgresCompetitionEntryRepository,
} from "./competition-entry.repositories.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");

describe("approved competition entry count", () => {
  it("counts only approved entries within the requested tenant and competition", async () => {
    const repository = new InMemoryCompetitionEntryRepository();
    const entries: readonly Pick<
      CompetitionEntry,
      "organizationId" | "competitionId" | "status"
    >[] = [
      { organizationId, competitionId, status: "approved" },
      { organizationId, competitionId, status: "pending" },
      { organizationId, competitionId, status: "rejected" },
      { organizationId, competitionId: asCompetitionId("competition-2"), status: "approved" },
      { organizationId: asOrganizationId("org-2"), competitionId, status: "approved" },
    ];
    for (const [index, entry] of entries.entries()) {
      await repository.save({
        ...entry,
        id: `entry-${index}`,
        teamId: asTeamId(`team-${index}`),
        creationKey: null,
        createdAt: new Date("2026-09-28T00:00:00Z"),
      });
    }
    await expect(
      repository.countApprovedByCompetition(organizationId, competitionId),
    ).resolves.toBe(1);
    await expect(
      repository.countApprovedByCompetition(organizationId, asCompetitionId("empty")),
    ).resolves.toBe(0);
  });

  it("uses a scoped aggregate instead of retrieving entry rows", async () => {
    const query = vi.fn(async () => ({ rows: [{ approved_count: 8 }] }));
    const repository = new PostgresCompetitionEntryRepository(asPgPool({ query }));
    await expect(
      repository.countApprovedByCompetition(organizationId, competitionId),
    ).resolves.toBe(8);
    expect(query).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(
        /COUNT\(\*\)::int[\s\S]*organization_id = \$1 AND competition_id = \$2 AND status = 'approved'/,
      ),
      [organizationId, competitionId],
    );
  });
});
