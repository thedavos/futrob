import { Effect } from "effect";
import { print } from "../lib/print.ts";

export function run(): Effect.Effect<number> {
  return Effect.sync(() => {
    print("pong");
    return 0;
  });
}
