import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

describe("organization audit SDK", () => {
  it("encodes the organization, filters and cursor and preserves the read-only page", async () => {
    const calls: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.test/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        calls.push(`${init?.method} ${requestUrl(input)}`);
        return Response.json({ entries: [], nextCursor: "next-page" });
      }),
    });
    const result = await client.audit.list("org/a", {
      competitionId: "comp?1",
      actorId: "actor 1",
      action: "sanction.imposed",
      from: "2026-11-01T00:00:00Z",
      cursor: "cursor+/=",
      limit: 10,
    });
    const url = new URL(calls[0].slice(4));
    expect(url.pathname).toBe("/api/v1/organizations/org%2Fa/audit");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      competitionId: "comp?1",
      actorId: "actor 1",
      action: "sanction.imposed",
      from: "2026-11-01T00:00:00Z",
      cursor: "cursor+/=",
      limit: "10",
    });
    expect(calls[0].startsWith("GET ")).toBe(true);
    expect(result).toEqual({ entries: [], nextCursor: "next-page" });
  });
  it("rejects reversed date ranges before contacting the server", async () => {
    let called = false;
    const client = createFutrobClient({
      baseUrl: "https://app.test/api/v1",
      fetchImpl: mockFetch(async () => {
        called = true;
        return Response.json({ entries: [], nextCursor: null });
      }),
    });
    await expect(
      client.audit.list("org", { from: "2026-11-11T00:00:00Z", to: "2026-11-01T00:00:00Z" }),
    ).rejects.toThrow();
    expect(called).toBe(false);
  });
});
