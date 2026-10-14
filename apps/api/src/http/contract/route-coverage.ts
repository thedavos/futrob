import { futrobOpenApiV1 } from "@futrob/api-contracts";
import type { Hono } from "hono";
import { z } from "zod";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
const API_PREFIX = "/api/v1";

export type SpecOperation = {
  readonly method: (typeof HTTP_METHODS)[number];
  readonly path: string;
};

export type RouteCoverageAllowlistEntry = SpecOperation & {
  readonly reason: string;
};

/**
 * Hono routes that are intentionally absent from the OpenAPI document.
 * Keep empty unless a route is truly internal and must stay unpublished.
 */
export const OPENAPI_ROUTE_COVERAGE_ALLOWLIST: readonly RouteCoverageAllowlistEntry[] = [];

const honoRouteSchema = z.object({
  method: z.string(),
  path: z.string(),
});

export type RouteCoverageDiff = {
  readonly undocumentedRoutes: readonly SpecOperation[];
  readonly missingRoutes: readonly SpecOperation[];
};

function operationKey(operation: SpecOperation): string {
  return `${operation.method} ${operation.path}`;
}

function isHttpMethod(method: string): method is SpecOperation["method"] {
  return HTTP_METHODS.some((allowed) => allowed === method);
}

function toSpecPath(honoPath: string): string {
  const trimmed = honoPath.startsWith(API_PREFIX) ? honoPath.slice(API_PREFIX.length) : honoPath;
  const withSlash = trimmed.length === 0 ? "/" : trimmed;
  return withSlash.replaceAll(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function skipSpecPath(path: string): boolean {
  return path === "/meta/health" || path === "/openapi.json" || path === "/openapi.yaml";
}

function skipHonoRoute(method: string, path: string): boolean {
  if (method === "ALL") return true;
  if (path.includes("*")) return true;
  return skipSpecPath(toSpecPath(path));
}

export function listSpecOperations(): SpecOperation[] {
  const operations: SpecOperation[] = [];
  for (const [path, item] of Object.entries(futrobOpenApiV1.paths)) {
    if (skipSpecPath(path)) continue;
    for (const method of HTTP_METHODS) {
      if (Object.hasOwn(item, method)) operations.push({ method, path });
    }
  }
  return operations;
}

export function listHonoOperations(app: Hono): SpecOperation[] {
  const routes = z.array(honoRouteSchema).parse(app.routes);
  const operations: SpecOperation[] = [];
  const seen = new Set<string>();
  for (const route of routes) {
    if (skipHonoRoute(route.method, route.path)) continue;
    const method = route.method.toLowerCase();
    if (!isHttpMethod(method)) continue;
    const operation = { method, path: toSpecPath(route.path) };
    const key = operationKey(operation);
    if (seen.has(key)) continue;
    seen.add(key);
    operations.push(operation);
  }
  return operations;
}

export function diffOperations(
  implemented: readonly SpecOperation[],
  documented: readonly SpecOperation[],
  allowlist: readonly RouteCoverageAllowlistEntry[] = OPENAPI_ROUTE_COVERAGE_ALLOWLIST,
): RouteCoverageDiff {
  const allowlisted = new Set(allowlist.map(operationKey));
  const implementedKeys = new Set(implemented.map(operationKey));
  const documentedKeys = new Set(documented.map(operationKey));
  return {
    undocumentedRoutes: implemented.filter(
      (operation) =>
        !documentedKeys.has(operationKey(operation)) && !allowlisted.has(operationKey(operation)),
    ),
    missingRoutes: documented.filter((operation) => !implementedKeys.has(operationKey(operation))),
  };
}

export function undocumentedHonoRoutes(app: Hono): readonly SpecOperation[] {
  return diffOperations(listHonoOperations(app), listSpecOperations()).undocumentedRoutes;
}

export function assertOpenApiRouteCoverage(app: Hono): void {
  const diff = diffOperations(listHonoOperations(app), listSpecOperations());
  if (diff.undocumentedRoutes.length === 0 && diff.missingRoutes.length === 0) return;
  const undocumented = diff.undocumentedRoutes.map(operationKey).join(", ");
  const missing = diff.missingRoutes.map(operationKey).join(", ");
  throw new Error(
    `OpenAPI route coverage failed. undocumented=[${undocumented}] missing=[${missing}]`,
  );
}
