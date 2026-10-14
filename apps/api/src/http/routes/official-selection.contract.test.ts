import { futrobOpenApiV1 } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { expectMatchesOpenApi } from "@/http/contract/openapi-contract.ts";
import { buildApp, stubFetch } from "@/http/http-app.harness.ts";

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

function officialSelectionOperations() {
  const operations: { path: string; method: (typeof METHODS)[number] }[] = [];
  for (const [path, item] of Object.entries(futrobOpenApiV1.paths)) {
    if (!path.includes("/official-selection")) continue;
    for (const method of METHODS) {
      if (Object.hasOwn(item, method)) operations.push({ path, method });
    }
  }
  return operations;
}

function concrete(path: string) {
  return `/api/v1${path
    .replaceAll("{organizationId}", "org-unknown")
    .replaceAll("{encounterId}", "enc-unknown")
    .replaceAll("{proposalId}", "proposal-unknown")}`;
}

describe("official-selection OpenAPI contract", () => {
  it("documents every operation and matches unauthenticated 401 bodies", async () => {
    const operations = officialSelectionOperations();
    expect(operations.length).toBeGreaterThanOrEqual(9);
    const app = buildApp(stubFetch);
    for (const { path, method } of operations) {
      const res = await app.request(concrete(path), {
        method: method.toUpperCase(),
        headers: { "Content-Type": "application/json" },
        body: method === "get" ? undefined : "{}",
      });
      expect(res.status, `${method} ${path}`).toBe(401);
      await expectMatchesOpenApi(res, method, path);
    }
  });
});
