import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { createModules } from "./create-modules.ts";

describe("authorization module bootstrap", () => {
  it("persists only the first configured superuser", async () => {
    const modules = createModules({
      fetcher: fetch,
      eaClubsBaseUrl: "https://example.test",
      pool: undefined,
    });
    const first = asActorId("first-superuser");

    await expect(modules.authorization.bootstrapInitialSuperuser(first)).resolves.toBe(true);
    await expect(
      modules.authorization.bootstrapInitialSuperuser(asActorId("ignored-superuser")),
    ).resolves.toBe(false);
    await expect(
      modules.authorization.port.decide({
        actorId: first,
        permission: ORGANIZATION_PERMISSION.superusersManage,
        scope: {},
      }),
    ).resolves.toMatchObject({ allowed: true });
  });
});
