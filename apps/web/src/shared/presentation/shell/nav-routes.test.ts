import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import {
  accountNavItems,
  contextNavFor,
  generalNavFor,
  type ShellNavItem,
} from "./nav-registry.ts";
import { WORKSPACE_SELECTION_KIND } from "./workspace-selection.ts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";

const ROUTES_DIR = fileURLToPath(new URL("../../../routes", import.meta.url));

/** TanStack file-route naming → URL path: `_x` layouts vanish, `x_` escapes nesting, `index` is `/`. */
function routePathFromFile(file: string): string {
  const withoutExtension = file.replace(/\.(tsx|ts)$/, "");
  const segments = withoutExtension
    .split(/[/.]/)
    .filter((segment) => segment !== "lazy" && segment !== "index" && !segment.startsWith("_"))
    .map((segment) => (segment.endsWith("_") ? segment.slice(0, -1) : segment))
    .map((segment) => (segment.startsWith("$") ? "$" : segment));
  return `/${segments.join("/")}`;
}

function existingRoutePaths(): ReadonlySet<string> {
  const files = readdirSync(ROUTES_DIR, { recursive: true, encoding: "utf8" }).filter((file) =>
    /\.(tsx|ts)$/.test(file),
  );
  return new Set(files.map(routePathFromFile));
}

/** Nav hrefs carry real ids; a route file names them `$param`. */
function hrefShape(href: string, ids: readonly string[]): string {
  return href
    .split("/")
    .map((segment) => (ids.includes(segment) ? "$" : segment))
    .join("/");
}

const IDS = ["org-1", "comp-1"];
const ALL_OPERATOR = new Set([COMPETITION_PERMISSION.update]);

function navigableItems(): readonly ShellNavItem[] {
  const org = { kind: WORKSPACE_SELECTION_KIND.organization, organizationId: "org-1" } as const;
  const competitionInOrg = {
    kind: WORKSPACE_SELECTION_KIND.competition,
    competitionId: "comp-1",
    organizationId: "org-1",
  } as const;
  const personalCompetition = {
    kind: WORKSPACE_SELECTION_KIND.competition,
    competitionId: "comp-1",
    organizationId: null,
  } as const;
  return [
    ...generalNavFor({ kind: WORKSPACE_SELECTION_KIND.personal }).items,
    ...generalNavFor(org).items,
    ...contextNavFor(competitionInOrg, ALL_OPERATOR).items,
    ...contextNavFor(competitionInOrg).items,
    ...contextNavFor(personalCompetition).items,
    ...accountNavItems(),
  ].filter((item) => !item.stub);
}

describe("shell navigation", () => {
  it("only links to routes that exist", () => {
    const routes = existingRoutePaths();
    // Guard against reading an empty directory, which would make the check pass vacuously.
    expect(routes.has("/orgs/$/competitions/$/team/roster")).toBe(true);
    const missing = navigableItems()
      .map((item) => ({ id: item.id, shape: hrefShape(item.href, IDS) }))
      .filter(({ shape }) => !routes.has(shape));
    expect(missing).toEqual([]);
  });

  it("resolves route file names the way the router does", () => {
    expect(routePathFromFile("_app/player_.competitions_.$competitionId_.team.index.tsx")).toBe(
      "/player/competitions/$/team",
    );
    expect(routePathFromFile("_app/orgs/$orgId/settings/index.tsx")).toBe("/orgs/$/settings");
    expect(routePathFromFile("_app/orgs/$orgId/competitions/$competitionId/teams.lazy.tsx")).toBe(
      "/orgs/$/competitions/$/teams",
    );
  });
});
