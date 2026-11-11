import { describe, expect, it } from "vite-plus/test";
import { RESERVED_ORGANIZATION_SLUGS } from "@futrob/organizations";
import { buildRobotsTxt, buildSitemapXml, PRIVATE_PATH_SEGMENTS } from "./crawl-policy.ts";

const ORIGIN = "https://futrob.app";

/** Google's robots.txt matching for the rules we emit: `$` anchors, otherwise prefix. */
function isDisallowed(robots: string, path: string): boolean {
  return robots
    .split("\n")
    .filter((line) => line.startsWith("Disallow: "))
    .map((line) => line.slice("Disallow: ".length))
    .some((rule) => (rule.endsWith("$") ? path === rule.slice(0, -1) : path.startsWith(rule)));
}

describe("robots.txt", () => {
  const robots = buildRobotsTxt(ORIGIN);

  it("keeps the signed-in area, the API and invitation links out of crawlers", () => {
    for (const path of [
      "/api/v1/meta/ping",
      "/api/auth/get-session",
      "/orgs/org-1/competitions/c-1",
      "/player",
      "/player/competitions/c-1/team",
      "/onboarding",
      "/admin/plans",
      "/invitations/abc",
      "/entry-invitations/link/secret-code",
      "/roster-invitations/token-1",
    ]) {
      expect(isDisallowed(robots, path), path).toBe(true);
    }
  });

  it("lets crawlers reach the landing, pricing and a published portal", () => {
    for (const path of ["/", "/pricing", "/liga-norte/copa-1", "/player-one/copa-1/standings"]) {
      expect(isDisallowed(robots, path), path).toBe(false);
    }
  });

  it("points crawlers to the sitemap on the same origin", () => {
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it("only blocks segments no organization can take as its slug", () => {
    for (const segment of PRIVATE_PATH_SEGMENTS) {
      expect(RESERVED_ORGANIZATION_SLUGS.has(segment), segment).toBe(true);
    }
  });
});

describe("sitemap.xml", () => {
  it("lists the landing, pricing and each published competition with its last update", () => {
    const xml = buildSitemapXml(ORIGIN, [
      { path: "/liga-norte/copa-1", lastmod: "2026-11-08T20:00:00.000Z" },
    ]);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])).toEqual([
      "https://futrob.app/",
      "https://futrob.app/pricing",
      "https://futrob.app/liga-norte/copa-1",
    ]);
    expect(xml).toContain("<lastmod>2026-11-08T20:00:00.000Z</lastmod>");
  });

  it("escapes addresses so a query string cannot break the document", () => {
    const xml = buildSitemapXml(ORIGIN, [
      { path: "/liga/copa?a=1&b=<2>", lastmod: "2026-11-08T20:00:00.000Z" },
    ]);

    expect(xml).toContain("<loc>https://futrob.app/liga/copa?a=1&amp;b=&lt;2&gt;</loc>");
  });

  it("is a valid empty-competitions sitemap when nothing is published", () => {
    const xml = buildSitemapXml(ORIGIN, []);

    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});
