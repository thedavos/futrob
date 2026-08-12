import { describe, expect, it } from "vite-plus/test";
import { futrobOpenApiV1 } from "./document.ts";

describe("provider sync job contract host", () => {
  it("publishes only the Railway service endpoints in the shared API document", () => {
    expect(Reflect.has(futrobOpenApiV1.paths, "/game-data/sync-jobs")).toBe(false);
    expect(futrobOpenApiV1.paths["/internal/game-data/sync-jobs"].post).toMatchObject({
      description: expect.stringContaining("internal bearer secret"),
    });
  });
});
