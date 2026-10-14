import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { bcDependencyGraphRule } from "./bc-dependency-graph.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { lang: "ts" },
    sourceType: "module",
  },
});

ruleTester.run("bc-dependency-graph", bcDependencyGraphRule, {
  valid: [
    {
      name: "allows results to import game-data public API",
      filename: "/repo/packages/results/src/domain/policies/slot-selection.ts",
      code: `import type { ProviderMatch } from "@futrob/game-data";`,
    },
    {
      name: "allows the same banned infra import from API adapters",
      filename: "/repo/apps/api/src/adapters/results/repository.ts",
      code: `import { Pool } from "pg";`,
    },
    {
      name: "allows shared-kernel in domain",
      filename: "/repo/packages/results/src/domain/errors/selection.errors.ts",
      code: `import { TaggedError } from "@futrob/shared-kernel";`,
    },
    {
      name: "allows a relative import that stays inside the package",
      filename:
        "/repo/packages/results/src/application/select-official-matches/select-official-matches.use-case.ts",
      code: `import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";`,
    },
    {
      name: "allows statistics to import results",
      filename:
        "/repo/packages/statistics/src/application/project-official-result/project-official-result.use-case.ts",
      code: `import type { OfficialResult } from "@futrob/results";`,
    },
    {
      name: "allows a TS import() type of an allowed BC",
      filename: "/repo/packages/results/src/domain/policies/slot-selection.ts",
      code: `type Match = import("@futrob/game-data").ProviderMatch;`,
    },
    {
      name: "allows a TS import() type of shared-kernel",
      filename: "/repo/packages/analytics/src/application/snapshot.ts",
      code: `type Authz = import("@futrob/shared-kernel").AuthorizationPort;`,
    },
    {
      name: "skips TS import() types in test files",
      filename: "/repo/packages/analytics/src/application/snapshot.test.ts",
      code: `type Status = import("@futrob/identity").OnboardingStatus;`,
    },
  ],
  invalid: [
    {
      name: "rejects pg in domain",
      filename: "/repo/packages/results/src/domain/store.ts",
      code: `import { Pool } from "pg";`,
      errors: [{ messageId: "infraImport" }],
    },
    {
      name: "rejects hono in application",
      filename: "/repo/packages/results/src/application/http.ts",
      code: `import { Hono } from "hono";`,
      errors: [{ messageId: "infraImport" }],
    },
    {
      name: "rejects analytics importing identity",
      filename: "/repo/packages/analytics/src/application/snapshot.ts",
      code: `import type { ActorId } from "@futrob/identity";`,
      errors: [{ messageId: "disallowedBc" }],
    },
    {
      name: "rejects a TS import() type of a disallowed BC",
      filename: "/repo/packages/analytics/src/application/snapshot.ts",
      code: `type Status = import("@futrob/identity").OnboardingStatus;`,
      errors: [{ messageId: "disallowedBc" }],
    },
    {
      name: "rejects typeof import() of a disallowed BC",
      filename: "/repo/packages/analytics/src/application/snapshot.ts",
      code: `type Identity = typeof import("@futrob/identity");`,
      errors: [{ messageId: "disallowedBc" }],
    },
    {
      name: "rejects a deep import via TS import() type",
      filename: "/repo/packages/results/src/domain/policies/slot-selection.ts",
      code: `type Match = import("@futrob/game-data/src/domain/entities/provider-match.ts").ProviderMatch;`,
      errors: [{ messageId: "deepImport" }],
    },
    {
      name: "rejects a deep import of another BC",
      filename: "/repo/packages/results/src/domain/policies/slot-selection.ts",
      code: `import type { ProviderMatch } from "@futrob/game-data/src/domain/entities/provider-match.ts";`,
      errors: [{ messageId: "deepImport" }],
    },
    {
      name: "rejects a relative import that escapes the package root",
      filename: "/repo/packages/results/src/domain/store.ts",
      code: `import { repository } from "../../../../apps/api/src/adapters/results/repository.ts";`,
      errors: [{ messageId: "relativeEscape" }],
    },
  ],
});
