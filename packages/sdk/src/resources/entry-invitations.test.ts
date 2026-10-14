import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { buildEntryInvitationShareUrl, buildWhatsAppShareUrl } from "../entry-invitation-share.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

const application = {
  entryId: "entry-1",
  status: "approved",
  teamId: "team-1",
  teamName: "Cóndor FC",
  createdAt: "2026-10-13T12:00:00.000Z",
};

describe("entry invitations SDK resource", () => {
  it("searches invitees under the competition with an encoded query", async () => {
    const urls: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        urls.push(requestUrl(input));
        return Response.json({
          players: [
            {
              actorId: "act-condor",
              gamertag: "condor 10",
              platform: "playstation",
              gameEdition: "FC 26",
              club: null,
              inCompetition: false,
              invitationPending: false,
            },
          ],
        });
      }),
    });

    const found = await client.entryInvitations.searchInvitees("org/a", "cmp-1", "  cón do ");

    expect(found.players.map((player) => player.gamertag)).toEqual(["condor 10"]);
    expect(urls).toEqual([
      "https://app.example.com/api/v1/organizations/org%2Fa/competitions/cmp-1/entry-invitations/candidates?q=c%C3%B3n+do",
    ]);
  });

  it("refuses to search with fewer than three characters without calling the API", async () => {
    let called = false;
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async () => {
        called = true;
        return Response.json({ players: [] });
      }),
    });

    await expect(client.entryInvitations.searchInvitees("org", "cmp", "co")).rejects.toThrow();
    expect(called).toBe(false);
  });

  it("accepts a directed invitation by id and a link by code", async () => {
    const calls: string[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        calls.push(`${init?.method} ${requestUrl(input)} ${String(init?.body)}`);
        return Response.json(
          { organizationId: "org", competitionId: "cmp", application },
          { status: 201 },
        );
      }),
    });
    const body = { teamName: "Cóndor FC", creationKey: "accept-key-1" };

    const byId = await client.entryInvitations.accept({ invitationId: "inv-1" }, body);
    await client.entryInvitations.accept({ code: "Ab_9-xyz" }, body);

    expect(byId.application.teamName).toBe("Cóndor FC");
    expect(calls).toEqual([
      `POST https://app.example.com/api/v1/entry-invitations/inv-1/accept ${JSON.stringify(body)}`,
      `POST https://app.example.com/api/v1/entry-invitations/links/Ab_9-xyz/accept ${JSON.stringify(body)}`,
    ]);
  });
});

describe("entry invitation share URLs", () => {
  it("builds the browser link from the code", () => {
    expect(buildEntryInvitationShareUrl("https://futrob.app/", "Ab_9-xyz")).toBe(
      "https://futrob.app/entry-invitations/link/Ab_9-xyz",
    );
  });

  it("puts the text and the link in a WhatsApp share intent", () => {
    expect(
      buildWhatsAppShareUrl(
        "Únete a Liga Interclubes:",
        "https://futrob.app/entry-invitations/link/Ab_9-xyz",
      ),
    ).toBe(
      "https://wa.me/?text=%C3%9Anete%20a%20Liga%20Interclubes%3A%20https%3A%2F%2Ffutrob.app%2Fentry-invitations%2Flink%2FAb_9-xyz",
    );
  });
});
