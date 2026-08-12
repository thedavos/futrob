import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";

const migration = readFileSync(
  fileURLToPath(new URL("../../../migrations/0029_onboarding_club_step.sql", import.meta.url)),
  "utf8",
);

describe("onboarding club-step migration", () => {
  it("rewrites incomplete legacy player progress before closing the constraint", () => {
    const rewrite = migration.indexOf("SET onboarding_current_step = 'club'");
    const constraint = migration.indexOf("ADD CONSTRAINT actor_onboarding_state_check");

    expect(rewrite).toBeGreaterThan(-1);
    expect(constraint).toBeGreaterThan(rewrite);
    expect(migration).toContain("onboarding_path = 'player'");
    expect(migration).toContain("onboarding_current_step = 'team'");
    expect(migration).toContain("'club'");
  });
});
