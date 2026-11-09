import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { RuleTester } from "oxlint/plugins-dev";
import { afterAll, describe, expect, it } from "vite-plus/test";

import { requireSkipTrackingIssueRule } from "./require-skip-tracking-issue.ts";
import { noTestRetryRule, noTestTimeoutRule } from "./test-run-options.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { lang: "ts" },
    sourceType: "module",
  },
});

ruleTester.run("no-test-timeout", noTestTimeoutRule, {
  valid: [
    { name: "allows a plain test", code: `it("works", async () => {});` },
    { name: "allows hooks without a timeout", code: `beforeAll(async () => {});` },
    {
      name: "allows unrelated options objects",
      code: `it("works", { concurrent: true }, () => {});`,
    },
    {
      name: "allows each tables that mention timeout",
      code: `it.each([{ timeout: 1 }])("case %#", () => {});`,
    },
    {
      name: "allows env gating with skipIf",
      code: `describe.skipIf(!databaseUrl)("postgres", () => {});`,
    },
    {
      name: "allows retry config passed to code under test",
      code: `it("retries EA", async () => { await client.fetch({ retry: { attempts: 3 } }); });`,
    },
    {
      name: "leaves retry options to no-test-retry",
      code: `describe("flaky", { retry: 3 }, () => {});`,
    },
  ],
  invalid: [
    {
      name: "rejects a numeric timeout argument",
      code: `it("slow", async () => {}, 60_000);`,
      errors: [{ messageId: "timeout" }],
    },
    {
      name: "rejects a timeout constant argument",
      code: `test("slow", async () => {}, TEST_TIMEOUT_MS);`,
      errors: [{ messageId: "timeout" }],
    },
    {
      name: "rejects timeout in test options",
      code: `it("slow", { timeout: 1000 }, async () => {});`,
      errors: [{ messageId: "timeout" }],
    },
    {
      name: "rejects a hook timeout",
      code: `beforeAll(async () => {}, 180_000);`,
      errors: [{ messageId: "timeout" }],
    },
    {
      name: "rejects timeouts on modified chains",
      code: `describe.skipIf(!databaseUrl).each([1])("case %i", () => {}, 1000);`,
      errors: [{ messageId: "timeout" }],
    },
    {
      name: "rejects timeouts through a skipIf alias",
      code: `
        const suite = describe.skipIf(!databaseUrl);
        suite("postgres", { timeout: TEST_TIMEOUT_MS }, () => {});
      `,
      errors: [{ messageId: "timeout" }],
    },
  ],
});

ruleTester.run("no-test-retry", noTestRetryRule, {
  valid: [
    { name: "allows a plain test", code: `it("works", async () => {});` },
    {
      name: "leaves timeouts to no-test-timeout",
      code: `it("slow", async () => {}, 60_000);`,
    },
    {
      name: "allows retry config passed to code under test",
      code: `it("retries EA", async () => { await client.fetch({ retry: { attempts: 3 } }); });`,
    },
    {
      name: "allows each tables that mention retry",
      code: `it.each([{ retry: 1 }])("case %#", () => {});`,
    },
  ],
  invalid: [
    {
      name: "rejects retry in describe options",
      code: `describe("flaky", { retry: 3 }, () => {});`,
      errors: [{ messageId: "retry" }],
    },
    {
      name: "rejects retry in trailing test options",
      code: `it("flaky", async () => {}, { retry: 2 });`,
      errors: [{ messageId: "retry" }],
    },
    {
      name: "rejects only the retry when timeout sits beside it",
      code: `it("flaky", { timeout: 1000, retry: 2 }, async () => {});`,
      errors: [{ messageId: "retry" }],
    },
    {
      name: "rejects retry through a skipIf alias",
      code: `
        const suite = describe.skipIf(!databaseUrl);
        suite("postgres", { retry: 3 }, () => {});
      `,
      errors: [{ messageId: "retry" }],
    },
  ],
});

ruleTester.run("require-skip-tracking-issue", requireSkipTrackingIssueRule, {
  valid: [
    { name: "allows active tests", code: `it("works", () => {});` },
    {
      name: "allows a skip with an issue number above",
      code: `
        // TODO(#123): re-enable once the rejection upsert is fixed.
        it.skip("rejects entries", () => {});
      `,
    },
    {
      name: "allows a skip with an issue URL above",
      code: `
        // https://github.com/thedavos/futrob/issues/42
        describe.skip("legacy", () => {});
      `,
    },
    {
      name: "allows env gating with skipIf",
      code: `describe.skipIf(!databaseUrl)("postgres", () => {});`,
    },
    {
      name: "allows the runtime context skip",
      code: `it("needs db", (ctx) => { ctx.skip(); });`,
    },
  ],
  invalid: [
    {
      name: "rejects an untracked it.skip",
      code: `it.skip("rejects entries", () => {});`,
      errors: [{ messageId: "untrackedSkip" }],
    },
    {
      name: "rejects a comment without an issue",
      code: `
        // flaky, fix later
        test.skip("flaky", () => {});
      `,
      errors: [{ messageId: "untrackedSkip" }],
    },
    {
      name: "rejects an issue comment that is not directly above",
      code: `
        // TODO(#123)

        it.skip("gap", () => {});
      `,
      errors: [{ messageId: "untrackedSkip" }],
    },
    {
      name: "rejects untracked todo and x-prefixed tests",
      code: `
        it.todo("later");
        xdescribe("old", () => {});
      `,
      errors: [{ messageId: "untrackedSkip" }, { messageId: "untrackedSkip" }],
    },
    {
      name: "rejects skips on chained modifiers",
      code: `describe.skip.each([1])("case %i", () => {});`,
      errors: [{ messageId: "untrackedSkip" }],
    },
  ],
});

/**
 * Runs the real `npm run lint:tests` config, so a too-broad override in the legacy timeout
 * allowlist fails here even when every rule passes its RuleTester cases.
 */
describe("tests.oxlintrc.json legacy timeout allowlist", () => {
  const repoRoot = fileURLToPath(new URL("../../../../", import.meta.url));
  const config = join(repoRoot, "tools/oxlint/tests.oxlintrc.json");
  const oxlint = join(repoRoot, "node_modules/.bin/oxlint");
  const allowlisted = "apps/api/src/http/routes/schedule-change-responses.test.ts";
  const scratch = mkdtempSync(join(tmpdir(), "futrob-lint-tests-"));

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  function lintAllowlisted(name: string, source: string) {
    const root = join(scratch, name);
    const file = join(root, allowlisted);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `import { it } from "vitest";\n${source}\n`);
    const run = spawnSync(oxlint, ["-c", config, "--format", "json", root], { encoding: "utf8" });
    const report = JSON.parse(run.stdout) as { diagnostics: { code: string }[] };
    return { status: run.status, codes: report.diagnostics.map((diagnostic) => diagnostic.code) };
  }

  it("still lists the fixture path", () => {
    expect(readFileSync(config, "utf8")).toContain(`"**/${allowlisted}"`);
  });

  it("allows a historical per-test timeout", () => {
    expect(lintAllowlisted("timeout", `it("slow", async () => {}, 60_000);`)).toEqual({
      status: 0,
      codes: [],
    });
  });

  it("still rejects retries", () => {
    expect(lintAllowlisted("retry", `it("flaky", { retry: 3 }, async () => {});`)).toEqual({
      status: 1,
      codes: ["futrob(no-test-retry)"],
    });
  });
});
