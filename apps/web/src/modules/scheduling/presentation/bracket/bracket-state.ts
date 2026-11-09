import type { CompetitionFixturePageState } from "../competition-fixture-state.ts";
import { bracketView, type BracketView } from "./bracket-model.ts";

/**
 * What the bracket page can show. It reads the same fixture as the calendar; a fixture
 * without knockout or playoff stages is its own state, not an empty draw.
 */
export type BracketPageState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "empty"; readonly refreshFailed: boolean; readonly retry: () => void }
  | { readonly kind: "no_bracket"; readonly refreshFailed: boolean; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly bracket: BracketView;
      readonly refreshFailed: boolean;
      readonly retry: () => void;
    };

export function bracketPageState(fixture: CompetitionFixturePageState): BracketPageState {
  if (fixture.kind !== "ready") return fixture;
  const bracket = bracketView(fixture.view);
  if (!bracket) {
    return { kind: "no_bracket", refreshFailed: fixture.refreshFailed, retry: fixture.retry };
  }
  return { kind: "ready", bracket, refreshFailed: fixture.refreshFailed, retry: fixture.retry };
}
