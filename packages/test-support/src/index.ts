/**
 * Shared test helpers. Add builders/fakes as cross-workspace suites appear.
 */

import type { Result } from "@futrob/shared-kernel";

/** Narrows a Result to its value, or fails the test when the result is Err. */
export function unwrapOk<T, E>(result: Result<T, E>): T {
  if (result.isOk()) return result.value;
  throw new Error(`expected Ok, got ${String(result.error)}`);
}

/** Narrows a Result to its error, or fails the test when the result is Ok. */
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (!result.isOk()) return result.error;
  throw new Error("expected Err");
}
