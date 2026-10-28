import { createApp } from "@/app.ts";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  seedComposition,
  HOME_CAPTAIN,
  AWAY_CAPTAIN,
  HOME,
  AWAY,
  ORG,
  ENCOUNTER,
  OPERATOR,
  STAFF,
  slot,
} from "@/di/official-selection.composition.fixture.ts";
import { INTERNAL_JOB_SECRET } from "@/http/http-app.harness.ts";
import { expect, it } from "vite-plus/test";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

it("requires service authentication and a trusted actor", async () => {
  const app = buildApp(stubFetch);
  const response = await app.request("/api/v1/official-results/missing/void", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  expect(response.status).toBe(401);
});
it("validates reason and returns the domain not-found failure", async () => {
  const app = buildApp(stubFetch);
  const send = (body: unknown) =>
    app.request("/api/v1/official-results/missing/void", {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify(body),
    });
  expect((await send({ reason: " " })).status).toBe(400);
  const missing = await send({});
  expect(missing.status).toBe(404);
  expect(await missing.json()).toMatchObject({ code: "results.official_result_not_found" });
});

it("denies captains and unrelated actors, permits the superuser, and preserves the void on retry", async () => {
  const { modules, project } = await seedComposition({
    pool: undefined,
    matches: new InMemoryProviderMatchRepository(),
  });
  const proposed = await modules.officialSelection.propose.execute({
    actorId: HOME_CAPTAIN,
    organizationId: ORG,
    encounterId: ENCOUNTER,
    actingTeamId: HOME,
    selections: slot("m-1"),
    expectedVersion: 0,
    commandKey: "propose",
  });
  if (proposed.isErr()) throw proposed.error;
  const confirmed = await modules.officialSelection.confirm.execute({
    actorId: AWAY_CAPTAIN,
    organizationId: ORG,
    encounterId: ENCOUNTER,
    actingTeamId: AWAY,
    proposalId: proposed.value.proposal!.id,
    expectedVersion: 1,
    commandKey: "confirm",
  });
  if (confirmed.isErr()) throw confirmed.error;
  const id = confirmed.value.approvedResult!.id;
  const app = createApp({
    modules,
    internalJobSecret: INTERNAL_JOB_SECRET,
    checkDbHealth: () => Promise.resolve("skipped"),
    correlationLogger: { info() {}, error() {} },
  });
  const send = (actor: string) =>
    app.request(`/api/v1/official-results/${id}/void`, {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ reason: "Correction" }),
    });
  for (const actor of [HOME_CAPTAIN, STAFF, "foreign-actor"])
    expect((await send(actor)).status).toBe(403);
  expect((await modules.results.results.findById(id))?.status).toBe("approved");
  await modules.organizations.repositories.memberships.add({
    organizationId: ORG,
    actorId: STAFF,
    role: "organizer",
    createdAt: new Date(),
  });
  const voided = await send(STAFF);
  expect(voided.status).toBe(200);
  expect(await voided.json()).toMatchObject({ id, status: "voided" });
  expect(project).toHaveBeenLastCalledWith({ officialResultId: id });
  expect((await modules.results.results.findById(id))?.status).toBe("voided");
  expect((await send(OPERATOR)).status).toBe(200);
});
