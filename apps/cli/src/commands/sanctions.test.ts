import { Cause, Effect, Exit } from "effect";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { UsageError } from "../lib/errors.ts";
import { sanctionsSmoke } from "./sanctions.ts";

afterEach(() => vi.unstubAllGlobals());

it.each(["1.9", "3trailing", "0", "101"])(
  "rejects invalid deduction %s before contacting the API",
  async (points) => {
    const fetch = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetch);
    const outcome = await Effect.runPromiseExit(
      sanctionsSmoke(["org", "competition", "team", "--outsider", "outsider", "--points", points]),
    );
    expect(Exit.isFailure(outcome) && Cause.failureOption(outcome.cause)).toMatchObject({
      value: expect.any(UsageError),
    });
    expect(fetch).not.toHaveBeenCalled();
  },
);
