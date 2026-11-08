import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { noTestTimeoutOrRetryRule } from "./no-test-timeout-or-retry.ts";
import { requireSkipTrackingIssueRule } from "./require-skip-tracking-issue.ts";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { lang: "ts" },
    sourceType: "module",
  },
});

ruleTester.run("no-test-timeout-or-retry", noTestTimeoutOrRetryRule, {
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
      name: "rejects retry in describe options",
      code: `describe("flaky", { retry: 3 }, () => {});`,
      errors: [{ messageId: "retry" }],
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
