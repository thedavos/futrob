import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { noCrossModuleAdapterImportRule } from "./no-cross-module-adapter-import.ts";
import { noUnparsedJsonBoundaryRule } from "./no-unparsed-json-boundary.ts";
import { preferTaggedErrorRule } from "./prefer-tagged-error.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { lang: "ts" },
    sourceType: "module",
  },
});

ruleTester.run("no-unparsed-json-boundary", noUnparsedJsonBoundaryRule, {
  valid: [
    {
      name: "allows an explicitly unknown response body",
      code: `
        async function read(response: Response): Promise<void> {
          const raw: unknown = await response.json().catch(() => null);
          void raw;
        }
      `,
    },
    {
      name: "allows assignment into an explicitly unknown variable",
      code: `
        async function read(response: Response): Promise<void> {
          let raw: unknown;
          raw = await response.json();
          void raw;
        }
      `,
    },
    {
      name: "allows a named Zod schema parser",
      code: `
        async function read(response: Response): Promise<Foo> {
          return fooSchema.parse(await response.json().catch(() => null));
        }
      `,
    },
    {
      name: "allows a generic schema parameter",
      code: `
        async function read(response: Response): Promise<Foo> {
          return schema.safeParse(await response.json()).data;
        }
      `,
    },
    {
      name: "allows a Zod factory parser",
      code: `
        const parsed: Foo = z.object({ id: z.string() }).parse(JSON.parse(text));
      `,
    },
    {
      name: "allows direct test assertions",
      code: `
        async function verify(response: Response): Promise<void> {
          expect(await response.json()).toEqual({});
        }
      `,
    },
  ],
  invalid: [
    {
      name: "rejects a typed response body through catch",
      code: `
        async function read(response: Response): Promise<void> {
          const body: Foo = await response.json().catch(() => null);
          void body;
        }
      `,
      errors: [{ messageId: "unparsed" }],
    },
    {
      name: "rejects typed destructuring",
      code: `
        async function read(response: Response): Promise<void> {
          const { id }: Foo = await response.json();
          void id;
        }
      `,
      errors: [{ messageId: "unparsed" }],
    },
    {
      name: "rejects a boundary nested in a typed object",
      code: `
        async function read(response: Response): Promise<void> {
          const result: Envelope = { body: await response.json() };
          void result;
        }
      `,
      errors: [{ messageId: "unparsed" }],
    },
    {
      name: "rejects a typed return",
      code: `
        async function read(response: Response): Promise<Foo> {
          return response.json().catch(() => null);
        }
      `,
      errors: [{ messageId: "unparsed" }],
    },
    {
      name: "rejects an unrelated parse method",
      code: `
        async function read(response: Response): Promise<void> {
          const body: Foo = codec.parse(await response.json());
          void body;
        }
      `,
      errors: [{ messageId: "unparsed" }],
    },
    {
      name: "rejects a concrete type assertion",
      code: `
        async function read(response: Response): Promise<void> {
          const body = (await response.json()) as Foo;
          void body;
        }
      `,
      errors: [{ messageId: "unparsed" }],
    },
    {
      name: "rejects JSON.parse assigned to a concrete type",
      code: `
        const body: Foo = JSON.parse(text);
      `,
      errors: [{ messageId: "unparsed" }],
    },
  ],
});

ruleTester.run("no-cross-module-adapter-import", noCrossModuleAdapterImportRule, {
  valid: [
    {
      name: "allows an owning module to import its adapter",
      filename: "/repo/apps/web/src/modules/identity/server/session.ts",
      code: `import { session } from "../adapters/auth/session.ts";`,
    },
    {
      name: "allows the web DI root to compose adapters",
      filename: "/repo/apps/web/src/di/identity.module.ts",
      code: `import { session } from "@/modules/identity/adapters/auth/session.ts";`,
    },
    {
      name: "allows the API DI root to compose adapters",
      filename: "/repo/apps/api/src/di/identity.module.ts",
      code: `import { repository } from "@/adapters/identity/repository.ts";`,
    },
    {
      name: "allows shared API persistence adapters",
      filename: "/repo/apps/api/src/adapters/identity/repository.ts",
      code: `import { executor } from "@/adapters/persistence/executor.ts";`,
    },
    {
      name: "allows adapter imports in focused adapter tests",
      filename: "/repo/apps/web/src/routes/identity.test.ts",
      code: `import { session } from "@/modules/identity/adapters/auth/session.ts";`,
    },
  ],
  invalid: [
    {
      name: "rejects a web route importing an adapter",
      filename: "/repo/apps/web/src/routes/account.ts",
      code: `import { session } from "@/modules/identity/adapters/auth/session.ts";`,
      errors: [{ messageId: "crossModuleAdapter" }],
    },
    {
      name: "rejects a web context importing an adapter",
      filename: "/repo/apps/web/src/context/auth.ts",
      code: `import { session } from "@/modules/identity/adapters/auth/session.ts";`,
      errors: [{ messageId: "crossModuleAdapter" }],
    },
    {
      name: "rejects a relative import into another module adapter",
      filename: "/repo/apps/web/src/modules/identity/server/session.ts",
      code: `import { repository } from "../../teams/adapters/repository.ts";`,
      errors: [{ messageId: "crossModuleAdapter" }],
    },
    {
      name: "rejects a dynamic cross-module adapter import",
      filename: "/repo/apps/web/src/routes/account.ts",
      code: `void import("@/modules/identity/adapters/auth/session.ts");`,
      errors: [{ messageId: "crossModuleAdapter" }],
    },
    {
      name: "rejects an API adapter importing another bounded context adapter",
      filename: "/repo/apps/api/src/adapters/statistics/projector.ts",
      code: `import { repository } from "@/adapters/results/repository.ts";`,
      errors: [{ messageId: "crossModuleAdapter" }],
    },
  ],
});

ruleTester.run("prefer-tagged-error", preferTaggedErrorRule, {
  valid: [
    `throw new DomainFailure({ code: "domain.failure" });`,
    `throw new Panic("Invariant failed");`,
    `class DomainFailure extends TaggedError("DomainFailure")<{ code: string }>() {}`,
  ],
  invalid: [
    {
      name: "rejects generic Error construction",
      code: `throw new Error("failure");`,
      errors: [{ messageId: "nativeError" }],
    },
    {
      name: "rejects native Error subclasses",
      code: `throw new RangeError("failure");`,
      errors: [{ messageId: "nativeError" }],
    },
    {
      name: "rejects Error called without new",
      code: `throw Error("failure");`,
      errors: [{ messageId: "nativeError" }],
    },
    {
      name: "rejects locally defined native Error subclasses",
      code: `class DomainFailure extends Error {}`,
      errors: [{ messageId: "nativeErrorSubclass" }],
    },
  ],
});
