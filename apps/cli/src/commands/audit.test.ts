import { Cause, Effect, Exit } from "effect";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { UsageError } from "../lib/errors.ts";
import { auditList } from "./audit.ts";

afterEach(() => vi.unstubAllGlobals());
it.each([
  ["--limit", "101"],
  ["--from", "yesterday"],
  ["--from", "2026-11-11T00:00:00Z", "--to", "2026-11-01T00:00:00Z"],
])("refuses invalid audit filters before any request: %j", async (...flags) => {
  const fetch = vi.fn(async () => Response.json({}));
  vi.stubGlobal("fetch", fetch);
  const outcome = await Effect.runPromiseExit(auditList(["org", ...flags]));
  expect(Exit.isFailure(outcome) && Cause.failureOption(outcome.cause)).toMatchObject({
    value: expect.any(UsageError),
  });
  expect(fetch).not.toHaveBeenCalled();
});
