import { parseOrganizationSlug } from "@futrob/organizations";
import { describe, expect, it } from "vite-plus/test";
import { organizationAssignments } from "./postgres-organization.repository.ts";

describe("organizationAssignments", () => {
  it("writes nothing when no field changes", () => {
    expect(organizationAssignments({})).toEqual([]);
    expect(
      organizationAssignments({
        name: undefined,
        slug: undefined,
        timeZone: undefined,
        logo: undefined,
      }),
    ).toEqual([]);
  });

  it("writes only the time zone, leaving the logo columns alone", () => {
    expect(organizationAssignments({ timeZone: "America/Lima" })).toEqual([
      ["time_zone", "America/Lima"],
    ]);
  });

  it("writes only the logo columns for an upload", () => {
    expect(
      organizationAssignments({
        logo: { kind: "upload", key: "organization-logos/org-1/crest.png" as never },
      }),
    ).toEqual([
      ["logo_kind", "upload"],
      ["logo_value", "organization-logos/org-1/crest.png"],
    ]);
  });

  it("clears the logo key when going back to the monogram", () => {
    expect(organizationAssignments({ logo: { kind: "monogram" } })).toEqual([
      ["logo_kind", "monogram"],
      ["logo_value", null],
    ]);
  });

  it("writes the name with its normalized form and the slug together", () => {
    const slug = parseOrganizationSlug("norte-fc");
    if (!slug) throw new Error("fixture slug must be valid");

    expect(
      organizationAssignments({ name: "Liga del Norte", normalizedName: "liga del norte", slug }),
    ).toEqual([
      ["name", "Liga del Norte"],
      ["normalized_name", "liga del norte"],
      ["slug", "norte-fc"],
    ]);
  });
});
