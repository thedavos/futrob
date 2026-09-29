import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { completeOrganizationOnboardingResponseSchema } from "@futrob/api-contracts";
import { err } from "@futrob/shared-kernel";
import { RosterCompetitionConflict } from "@futrob/teams";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import {
  INTERNAL_JOB_SECRET,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const schema = `competition_application_${randomUUID().replaceAll("-", "")}`;
let admin: Pool;
let pool: Pool;

describe.skipIf(!databaseUrl)("competition application Postgres atomicity", () => {
  beforeAll(async () => {
    admin = new Pool({ connectionString: databaseUrl });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    const migrations = new URL("../../../migrations/", import.meta.url);
    for (const filename of (await readdir(migrations))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await pool.query(await readFile(new URL(filename, migrations), "utf8"));
    }
  });

  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  });

  it("rolls back team and entry on a captaincy conflict and permits a clean retry", async () => {
    const modules = createModules({
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://example.test",
      pool,
    });
    const app = createApp({
      modules,
      internalJobSecret: INTERNAL_JOB_SECRET,
      correlationLogger: { info: () => undefined, error: () => undefined },
      checkDbHealth: async () => "ok",
    });
    const organizer = "application-rollback-organizer";
    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Application rollback",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    expect(created.status).toBe(200);
    const organization = await parseResponse(completeOrganizationOnboardingResponseSchema, created);
    const competitionId = organization.competition.competition.id;
    const opened = await app.request(
      `/api/v1/organizations/${organization.organizationId}/competitions/${competitionId}/registration/open`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
      },
    );
    expect(opened.status).toBe(200);
    const claim = vi.spyOn(modules.teams.claimApplicantCaptaincy, "execute").mockResolvedValueOnce(
      err(
        new RosterCompetitionConflict({
          code: "teams.roster_competition_conflict",
          message: "Another application won the roster race",
        }),
      ),
    );
    const apply = () =>
      app.request(`/api/v1/competitions/explore/${competitionId}/application`, {
        method: "POST",
        headers: serviceHeaders("rollback-applicant"),
        body: JSON.stringify({
          teamName: "Rollback team",
          creationKey: "rollback-application-key",
        }),
      });
    const failed = await apply();
    expect(failed.status).toBe(409);
    expect(await failed.json()).toMatchObject({ code: "teams.roster_competition_conflict" });
    expect(
      (
        await pool.query("SELECT id FROM teams WHERE creation_key = $1", [
          "rollback-application-key:team",
        ])
      ).rows,
    ).toEqual([]);
    expect(
      (
        await pool.query("SELECT id FROM competition_entries WHERE creation_key = $1", [
          "rollback-application-key:entry",
        ])
      ).rows,
    ).toEqual([]);
    claim.mockRestore();
    const retried = await apply();
    expect(retried.status).toBe(201);
    expect(await retried.json()).toMatchObject({ teamName: "Rollback team", status: "pending" });
  });
});
