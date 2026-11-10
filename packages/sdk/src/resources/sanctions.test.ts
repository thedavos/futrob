import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

const sanction = {
  id: "san-1",
  competitionId: "cmp-1",
  targetType: "team",
  teamId: "team-1",
  teamName: "Cóndor FC",
  playerProfileId: null,
  playerName: null,
  type: "points_deduction",
  pointsDeducted: 3,
  suspensionMatches: null,
  encounterId: null,
  reason: "Alineación indebida",
  imposedByActorId: "act-organizer",
  imposedAt: "2026-11-10T12:00:00.000Z",
  requestId: "req-1",
  revocation: null,
};

describe("sanctions SDK resource", () => {
  it("lists, imposes and revokes under the competition and reads a Team's own", async () => {
    const calls: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        calls.push(`${init?.method} ${requestUrl(input)} ${init?.body ?? ""}`.trim());
        if (init?.method === "GET") return Response.json({ sanctions: [sanction] });
        return Response.json(sanction, { status: init?.method === "POST" ? 201 : 200 });
      }),
    });

    const listed = await client.sanctions.list("org/a", "cmp-1");
    await client.sanctions.listForTeam("org/a", "cmp-1", "team-1");
    await client.sanctions.impose("org/a", "cmp-1", {
      target: { type: "team", teamId: "team-1" },
      type: "points_deduction",
      reason: "  Alineación indebida ",
      pointsDeducted: 3,
    });
    await client.sanctions.revoke("org/a", "cmp-1", "san-1", { reason: "Apelación aceptada" });

    expect(listed.sanctions.map((row) => row.id)).toEqual(["san-1"]);
    const base = "https://app.example.com/api/v1/organizations/org%2Fa/competitions/cmp-1";
    expect(calls).toEqual([
      `GET ${base}/sanctions`,
      `GET ${base}/teams/team-1/sanctions`,
      `POST ${base}/sanctions ${JSON.stringify({
        target: { type: "team", teamId: "team-1" },
        type: "points_deduction",
        reason: "Alineación indebida",
        pointsDeducted: 3,
      })}`,
      `POST ${base}/sanctions/san-1/revoke ${JSON.stringify({ reason: "Apelación aceptada" })}`,
    ]);
  });

  it("refuses a reason shorter than three characters without calling the API", async () => {
    let called = false;
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async () => {
        called = true;
        return Response.json(sanction);
      }),
    });

    await expect(
      client.sanctions.revoke("org", "cmp", "san-1", { reason: " a " }),
    ).rejects.toThrow();
    expect(called).toBe(false);
  });
});
