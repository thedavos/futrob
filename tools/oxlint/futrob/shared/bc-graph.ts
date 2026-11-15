import { isInsideRoot, normalizePath, resolveImportPath } from "./module-paths.ts";

/**
 * MVP bounded contexts. Keep in lockstep with
 * `docs/architecture/dependency-graph.md` and `docs/architecture/module-boundaries.md`.
 */
export const BOUNDED_CONTEXTS = [
  "identity",
  "organizations",
  "competitions",
  "teams",
  "scheduling",
  "game-data",
  "results",
  "statistics",
  "analytics",
  "notifications",
  "public-portal",
  "billing",
] as const;

export type BoundedContext = (typeof BOUNDED_CONTEXTS)[number];

const BOUNDED_CONTEXT_SET: ReadonlySet<string> = new Set(BOUNDED_CONTEXTS);

const BC_SRC_RE = new RegExp(`(?:^|/)packages/(${BOUNDED_CONTEXTS.join("|")})/src(?:/|$)`);

/**
 * Allowed BC → BC package imports (`@futrob/<bc>` public API only).
 * Derived from the DAG in `docs/architecture/dependency-graph.md`.
 * Empty lists are leaves: they may depend on `@futrob/shared-kernel`, not on other BCs.
 *
 * Current production imports are a subset of this map (results→game-data,
 * statistics→results, teams→game-data). Missing edges are allowed for later
 * wiring, not a license to import the other direction.
 */
export const ALLOWED_BC_DEPENDENCIES = {
  identity: [],
  organizations: ["identity"],
  competitions: [],
  teams: ["game-data", "identity"],
  scheduling: ["competitions", "teams"],
  "game-data": [],
  results: ["game-data", "scheduling", "competitions"],
  statistics: ["results"],
  analytics: ["statistics", "scheduling", "results"],
  // notifications consume versioned events via shared contracts, not BC packages.
  notifications: [],
  "public-portal": ["statistics", "competitions"],
  // billing is a leaf: consumers declare their own plan-limit ports, bridged in apps/api/src/di.
  billing: [],
} as const satisfies Record<BoundedContext, readonly BoundedContext[]>;

export type GraphAllowlistEntry = Readonly<{
  from: BoundedContext;
  to: BoundedContext;
}>;

/**
 * Explicit exceptions to `ALLOWED_BC_DEPENDENCIES`. Never a silent baseline:
 * each entry needs a TODO explaining why the edge exists in code without
 * belonging on the canonical DAG.
 */
export const GRAPH_ALLOWLIST: readonly GraphAllowlistEntry[] = [
  // Example:
  // // TODO(#nnn): statistics src currently imports @futrob/game-data for X;
  // // fold that contract into results or add the edge to the DAG first.
  // { from: "statistics", to: "game-data" },
];

const GRAPH_ALLOWLIST_KEYS = new Set(GRAPH_ALLOWLIST.map((entry) => `${entry.from}\0${entry.to}`));

/** Infra and presentation packages banned from `packages/<bc>/src`. */
const FORBIDDEN_INFRA_PACKAGES = [
  "pg",
  "postgres",
  "hono",
  "wrangler",
  "@futrob/sdk",
  "@futrob/api-contracts",
  "@futrob/ui",
  "@futrob/ui-tokens",
  // Not used in domain/application today; logging stays at app boundaries.
  "@futrob/logger",
] as const;

const FORBIDDEN_INFRA_PREFIXES = ["node:", "cloudflare:", "@hono/", "@cloudflare/"] as const;

const FUTROB_SPECIFIER_RE = /^@futrob\/([^/]+)(?:\/(.*))?$/;

export function isBoundedContext(name: string): name is BoundedContext {
  return BOUNDED_CONTEXT_SET.has(name);
}

export function isAllowedBcImport(from: BoundedContext, to: BoundedContext): boolean {
  if (from === to) return true;
  if (ALLOWED_BC_DEPENDENCIES[from].some((allowed) => allowed === to)) return true;
  return GRAPH_ALLOWLIST_KEYS.has(`${from}\0${to}`);
}

export function importerBoundedContext(filePath: string): BoundedContext | null {
  const match = normalizePath(filePath).match(BC_SRC_RE);
  const name = match?.[1];
  if (name === undefined || !isBoundedContext(name)) return null;
  return name;
}

export function bcPackageRoot(filePath: string): string | null {
  const bc = importerBoundedContext(filePath);
  if (bc === null) return null;
  const normalized = normalizePath(filePath);
  const marker = `/packages/${bc}`;
  const index = normalized.lastIndexOf(marker);
  if (index === -1) return null;
  const after = index + marker.length;
  if (after < normalized.length && normalized[after] !== "/") return null;
  return normalized.slice(0, after);
}

export function relativeImportEscapesPackage(importerPath: string, source: string): boolean {
  if (!source.startsWith(".")) return false;
  const root = bcPackageRoot(importerPath);
  if (root === null) return false;
  return !isInsideRoot(resolveImportPath(importerPath, source), root);
}

export type FutrobSpecifier = Readonly<{
  name: string;
  subpath: string | null;
}>;

export function parseFutrobSpecifier(source: string): FutrobSpecifier | null {
  const match = source.match(FUTROB_SPECIFIER_RE);
  if (match === null) return null;
  const name = match[1];
  if (name === undefined) return null;
  const subpath = match[2];
  return { name, subpath: subpath === undefined || subpath === "" ? null : subpath };
}

export function forbiddenInfraSpecifier(source: string): string | null {
  for (const pkg of FORBIDDEN_INFRA_PACKAGES) {
    if (source === pkg || source.startsWith(`${pkg}/`)) return pkg;
  }
  for (const prefix of FORBIDDEN_INFRA_PREFIXES) {
    if (source.startsWith(prefix)) return source;
  }
  return null;
}
