import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { QueryClient } from "@tanstack/react-query";
import { organizationMembersQueryOptions } from "./organization-queries.ts";
import { filterOrganizationMembers, organizationMemberView } from "./organization-members-model.ts";

const member = {
  actorId: "member-a",
  displayName: null,
  email: null,
  role: "member" as const,
  joinedAt: "2026-01-01T00:00:00.000Z",
  access: { kind: "none" as const },
};
afterEach(() => vi.unstubAllGlobals());

describe("organization members query", () => {
  it.each([401, 403, 404])(
    "drops previously cached rows on confirmed refusal %s",
    async (status) => {
      let refused = false;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          refused
            ? Response.json(
                {
                  code: "organizations.authorization_forbidden",
                  messageKey: "errors.organizations.authorization_forbidden",
                },
                { status },
              )
            : Response.json({ members: [member] }),
        ),
      );
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      const options = organizationMembersQueryOptions("org-a");
      await client.fetchQuery(options);
      refused = true;
      expect(await client.fetchQuery(options)).toEqual({ kind: "denied" });
      expect(client.getQueryData(options.queryKey)).toEqual({ kind: "denied" });
      client.clear();
    },
  );

  it("retains cached rows on transient refresh failure and isolates organization keys", async () => {
    let failed = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        failed
          ? Response.json(
              { code: "api.unavailable", messageKey: "errors.api.unavailable" },
              { status: 503 },
            )
          : Response.json({ members: [member] }),
      ),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const options = organizationMembersQueryOptions("org-a");
    const cached = await client.fetchQuery(options);
    failed = true;
    await expect(client.fetchQuery(options)).rejects.toThrow();
    expect(client.getQueryData(options.queryKey)).toEqual(cached);
    expect(client.getQueryData(organizationMembersQueryOptions("org-b").queryKey)).toBeUndefined();
    expect(client.defaultQueryOptions(options).placeholderData).toBeUndefined();
    client.clear();
  });

  it("maps absent identity to localized copy and searches only visible name and email", () => {
    const unnamed = organizationMemberView(member, "Miembro sin nombre");
    const named = organizationMemberView(
      {
        ...member,
        actorId: "other",
        displayName: "Lucía",
        email: "visible@example.test",
        role: "staff",
      },
      "Miembro sin nombre",
    );
    expect(unnamed.name).toBe("Miembro sin nombre");
    expect(filterOrganizationMembers([unnamed, named], "lucia", "all")).toEqual([named]);
    expect(filterOrganizationMembers([unnamed, named], "visible@", "staff")).toEqual([named]);
    expect(filterOrganizationMembers([unnamed, named], "null", "all")).toEqual([]);
    expect(filterOrganizationMembers([unnamed, named], "lucia visible", "all")).toEqual([]);
  });
});
