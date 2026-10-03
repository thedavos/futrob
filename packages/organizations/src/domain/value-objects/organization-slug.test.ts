import { describe, expect, it } from "vite-plus/test";
import {
  organizationSlugCandidates,
  parseOrganizationSlug,
  slugifyOrganizationText,
} from "./organization-slug.ts";

describe("parseOrganizationSlug", () => {
  it("accepts lowercase words joined by single hyphens", () => {
    expect(parseOrganizationSlug("liga-norte")).toBe("liga-norte");
    expect(parseOrganizationSlug("copa2026")).toBe("copa2026");
    expect(parseOrganizationSlug("  liga-norte  ")).toBe("liga-norte");
  });

  it.each([
    ["too short", "ab"],
    ["too long", "a".repeat(49)],
    ["uppercase", "Liga-Norte"],
    ["spaces", "liga norte"],
    ["leading hyphen", "-liga"],
    ["trailing hyphen", "liga-"],
    ["double hyphen", "liga--norte"],
    ["accents", "liga-ñandú"],
    ["underscore", "liga_norte"],
    ["reserved word", "admin"],
    ["reserved brand", "futrob"],
    ["empty", ""],
  ])("rejects %s", (_label, input) => {
    expect(parseOrganizationSlug(input)).toBeNull();
  });

  it("accepts the maximum length", () => {
    expect(parseOrganizationSlug("a".repeat(48))).toBe("a".repeat(48));
  });

  it("accepts a reserved word inside a longer slug", () => {
    expect(parseOrganizationSlug("admin-league")).toBe("admin-league");
  });
});

describe("slugifyOrganizationText", () => {
  it("drops diacritics, lowercases and joins words", () => {
    expect(slugifyOrganizationText("Liga Ñandú: Edición 2026!")).toBe("liga-nandu-edicion-2026");
  });

  it("collapses repeated separators and trims them", () => {
    expect(slugifyOrganizationText("  --Liga   Norte--  ")).toBe("liga-norte");
  });

  it("falls back to a generic base when nothing usable remains", () => {
    expect(slugifyOrganizationText("¡¡!!")).toBe("org");
    expect(slugifyOrganizationText("ab")).toBe("org");
  });

  it("cuts at the maximum length without a trailing hyphen", () => {
    const slug = slugifyOrganizationText(`${"a".repeat(47)} bbbb`);
    expect(slug).toBe("a".repeat(47));
  });
});

describe("organizationSlugCandidates", () => {
  function firstCandidates(text: string, count: number): string[] {
    const found: string[] = [];
    for (const candidate of organizationSlugCandidates(text)) {
      found.push(candidate);
      if (found.length === count) break;
    }
    return found;
  }

  it("proposes the base first and numbered variants after it", () => {
    expect(firstCandidates("Liga Norte", 3)).toEqual([
      "liga-norte",
      "liga-norte-2",
      "liga-norte-3",
    ]);
  });

  it("skips a reserved base", () => {
    expect(firstCandidates("Admin", 2)).toEqual(["admin-2", "admin-3"]);
  });

  it("keeps variants within the maximum length", () => {
    const [, second] = firstCandidates("a".repeat(60), 2);
    expect(second).toBe(`${"a".repeat(46)}-2`);
  });
});
