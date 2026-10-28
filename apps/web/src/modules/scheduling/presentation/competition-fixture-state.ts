import type { GetCurrentCompetitionFixtureResponse } from "@futrob/api-contracts";
import { competitionFixtureView, type CompetitionFixtureView } from "./competition-fixture-view.ts";

/** What the calendar can show. A missing fixture is not a failed read, and a refusal is not empty. */
export type CompetitionFixturePageState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "empty"; readonly refreshFailed: boolean; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly view: CompetitionFixtureView;
      readonly refreshFailed: boolean;
      readonly retry: () => void;
    };

export function competitionFixturePageState(input: {
  readonly data: GetCurrentCompetitionFixtureResponse | undefined;
  readonly failed: boolean;
  readonly refused: boolean;
  readonly retry: () => void;
}): CompetitionFixturePageState {
  if (input.data) {
    const view = competitionFixtureView(input.data);
    if (!view) return { kind: "empty", refreshFailed: input.failed, retry: input.retry };
    return { kind: "ready", view, refreshFailed: input.failed, retry: input.retry };
  }
  if (input.failed) {
    return input.refused ? { kind: "not_found" } : { kind: "error", retry: input.retry };
  }
  return { kind: "loading" };
}
