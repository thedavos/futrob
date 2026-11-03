import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { createModules } from "@/di/create-modules.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const TEST_TIMEOUT_MS = 180_000;
const ROUNDS = 8;

suite("onboarding completion on Postgres", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "onboarding_completion");
    await migrateIsolatedSchema(isolated.pool);
  }, TEST_TIMEOUT_MS);

  afterAll(async () => {
    await isolated?.drop();
  }, TEST_TIMEOUT_MS);

  it(
    "lets exactly one of two concurrent finishes on different paths win, with no side effects from the loser",
    async () => {
      const modules = createModules({
        pool: isolated.pool,
        fetcher: async () => {
          throw new Error("EA must not be called");
        },
        eaClubsBaseUrl: "https://ea.example.test/api/fc",
      });

      for (let round = 0; round < ROUNDS; round += 1) {
        const actorId = asActorId(`onboarding-race-${round}`);
        await seedActors(isolated.pool, actorId);

        const [organization, player] = await Promise.all([
          modules.onboardingCompletion.completeOrganization({
            actorId,
            name: `Liga carrera ${round}`,
            competition: {
              name: "Apertura",
              gameEdition: "FC 26",
              platform: "playstation",
              region: "south-america",
              timeZone: "America/Lima",
              format: "league",
            },
            gameAccount: null,
          }),
          modules.onboardingCompletion.completePlayer({
            actorId,
            gameAccount: null,
            externalClub: null,
          }),
        ]);

        const winners = [organization, player].filter((result) => result.isOk());
        const losers = [organization, player].filter((result) => !result.isOk());
        expect(winners).toHaveLength(1);
        expect(losers.map((result) => (result.isOk() ? null : result.error.code))).toEqual([
          "identity.onboarding_path_conflict",
        ]);

        const status = await modules.identity.getOnboardingStatus.execute({ actorId });
        const organizations = await isolated.pool.query(
          `SELECT COUNT(*)::int AS count FROM organizations WHERE created_by_actor_id = $1`,
          [actorId],
        );
        expect({ path: status.path, organizations: organizations.rows[0].count }).toEqual(
          organization.isOk()
            ? { path: "organization", organizations: 1 }
            : { path: "player", organizations: 0 },
        );
      }
    },
    TEST_TIMEOUT_MS,
  );
});
