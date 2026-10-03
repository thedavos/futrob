import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, parseMockJsonBody, requestUrl } from "../testing/mock-fetch.ts";

const profile = {
  organizationId: "org-1",
  name: "Liga Norte",
  slug: "liga-norte",
  timeZone: "America/Lima",
  logo: { kind: "monogram" },
};

function recordingClient(responseBody: unknown, status = 200) {
  const requests: Array<{ url: string; method: string | undefined; body: unknown }> = [];
  const client = createFutrobClient({
    baseUrl: "https://app.example.com/api/v1",
    fetchImpl: mockFetch(async (input, init) => {
      requests.push({
        url: requestUrl(input),
        method: init?.method,
        body: parseMockJsonBody(init),
      });
      return Response.json(responseBody, { status });
    }),
  });
  return { client, requests };
}

describe("organizations SDK resource profile methods", () => {
  it("creates an organization with its time zone and optional slug", async () => {
    const { client, requests } = recordingClient({ ...profile, role: "organizer" }, 201);

    const created = await client.organizations.create({
      name: "Liga Norte",
      timeZone: "America/Lima",
      slug: "liga-norte",
    });

    expect(requests).toEqual([
      {
        url: "https://app.example.com/api/v1/organizations",
        method: "POST",
        body: { name: "Liga Norte", timeZone: "America/Lima", slug: "liga-norte" },
      },
    ]);
    expect(created).toEqual({ ...profile, role: "organizer" });
  });

  it("checks slug availability with the editing organization id", async () => {
    const { client, requests } = recordingClient({
      available: false,
      reason: "taken",
      suggestion: "liga-norte-2",
    });

    const result = await client.organizations.checkSlugAvailability({
      slug: "liga-norte",
      organizationId: "org-1",
    });

    expect(requests[0]).toEqual({
      url: "https://app.example.com/api/v1/organizations/slug-availability",
      method: "POST",
      body: { slug: "liga-norte", organizationId: "org-1" },
    });
    expect(result).toEqual({ available: false, reason: "taken", suggestion: "liga-norte-2" });
  });

  it("reads, patches and sets the logo through the organization's own paths", async () => {
    const { client, requests } = recordingClient(profile);

    await client.organizations.get("org 1/x");
    await client.organizations.updateProfile("org-1", { slug: "norte-fc" });
    await client.organizations.setLogo("org-1", {
      logo: { kind: "upload", key: "organization-logos/org-1/crest.png" },
    });

    expect(requests).toEqual([
      {
        url: "https://app.example.com/api/v1/organizations/org%201%2Fx",
        method: "GET",
        body: null,
      },
      {
        url: "https://app.example.com/api/v1/organizations/org-1",
        method: "PATCH",
        body: { slug: "norte-fc" },
      },
      {
        url: "https://app.example.com/api/v1/organizations/org-1/logo",
        method: "PUT",
        body: { logo: { kind: "upload", key: "organization-logos/org-1/crest.png" } },
      },
    ]);
  });

  it("refuses an empty profile update before sending anything", async () => {
    const { client, requests } = recordingClient(profile);

    await expect(client.organizations.updateProfile("org-1", {})).rejects.toThrow();
    expect(requests).toEqual([]);
  });
});
