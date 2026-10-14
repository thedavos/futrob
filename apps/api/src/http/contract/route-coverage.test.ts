import { describe, expect, it } from "vite-plus/test";
import { buildApp, stubFetch } from "@/http/http-app.harness.ts";
import { assertOpenApiRouteCoverage, diffOperations } from "@/http/contract/route-coverage.ts";

describe("OpenAPI route coverage", () => {
  it("matches registered product routes to documented operations", () => {
    expect(() => assertOpenApiRouteCoverage(buildApp(stubFetch))).not.toThrow();
  });

  it("reports both undocumented routes and spec operations without a handler", () => {
    const diff = diffOperations(
      [{ method: "get", path: "/probe" }],
      [{ method: "get", path: "/meta/ping" }],
    );
    expect(diff.undocumentedRoutes).toEqual([{ method: "get", path: "/probe" }]);
    expect(diff.missingRoutes).toEqual([{ method: "get", path: "/meta/ping" }]);
  });
});
