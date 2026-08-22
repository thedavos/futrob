import { Effect } from "effect";
import { UsageError } from "./errors.ts";

/** Fails with UsageError unless exactly `count` positionals are present. */
export function requirePositionals(
  positionals: readonly string[],
  count: number,
  usage: string,
): Effect.Effect<string[], UsageError> {
  if (positionals.length < count) {
    return Effect.fail(
      new UsageError({ message: `Faltan ${count - positionals.length} argumento(s).`, usage }),
    );
  }
  return Effect.succeed(positionals.slice(0, count));
}
