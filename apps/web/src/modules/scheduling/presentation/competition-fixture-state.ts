import type { GetCurrentCompetitionFixtureResponse } from "@futrob/api-contracts";
import { competitionFixtureView, type CompetitionFixtureView } from "./competition-fixture-view.ts";
import type { SwissGenerateContext } from "./swiss-fixture-generate-model.ts";

/** What the calendar can show. A missing fixture is not a failed read, and a refusal is not empty. */
export type CompetitionFixturePageState =
  | { readonly kind: "loading" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "empty";
      readonly refreshFailed: boolean;
      readonly retry: () => void;
      /** Set when this actor can generate a Swiss fixture now; other formats stay empty. */
      readonly generate: SwissGenerateContext | null;
    }
  | {
      readonly kind: "ready";
      readonly view: CompetitionFixtureView;
      readonly refreshFailed: boolean;
      readonly retry: () => void;
      /** Swiss organizer commands are offered; the server re-checks them. */
      readonly canManageSwiss: boolean;
    };

export function competitionFixturePageState(input: {
  readonly data: GetCurrentCompetitionFixtureResponse | undefined;
  readonly failed: boolean;
  readonly refused: boolean;
  readonly retry: () => void;
  readonly generate?: SwissGenerateContext | null;
  readonly canManageSwiss?: boolean;
}): CompetitionFixturePageState {
  if (input.data) {
    const view = competitionFixtureView(input.data);
    if (!view) {
      return {
        kind: "empty",
        refreshFailed: input.failed,
        retry: input.retry,
        generate: input.generate ?? null,
      };
    }
    return {
      kind: "ready",
      view,
      refreshFailed: input.failed,
      retry: input.retry,
      canManageSwiss: (input.canManageSwiss ?? false) && view.swiss !== null,
    };
  }
  if (input.failed) {
    return input.refused ? { kind: "not_found" } : { kind: "error", retry: input.retry };
  }
  return { kind: "loading" };
}
