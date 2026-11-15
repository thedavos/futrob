import { describe, expect, it } from "vite-plus/test";
import { listOrganizationAuditQuerySchema, organizationAuditEntrySchema } from "./audit.schemas.ts";

describe("organization audit contract", () => {
  it("accepts bounded filters and ISO date ranges with offsets", () => {
    expect(
      listOrganizationAuditQuerySchema.parse({
        limit: "10",
        actorId: " actor-1 ",
        from: "2026-11-01T00:00:00-05:00",
        to: "2026-11-11T00:00:00Z",
      }),
    ).toMatchObject({ limit: 10, actorId: "actor-1" });
    expect(listOrganizationAuditQuerySchema.parse({})).toEqual({ limit: 25 });
  });
  it.each([
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { actorId: " " },
    { from: "yesterday" },
    { from: "2026-11-11T00:00:00Z", to: "2026-11-01T00:00:00Z" },
  ])("refuses invalid filters %o", (query) => {
    expect(listOrganizationAuditQuerySchema.safeParse(query).success).toBe(false);
  });
  it("does not accept an external object link", () => {
    const result = organizationAuditEntrySchema.safeParse({
      id: "entry-1",
      organizationId: "org-1",
      competitionId: null,
      actorId: "actor-1",
      actorName: null,
      action: "organization.created",
      reason: null,
      occurredAt: "2026-11-10T00:00:00Z",
      requestId: null,
      object: { type: "organization", id: "org-1", label: null, href: "https://example.com" },
    });
    expect(result.success).toBe(false);
  });
});
