/**
 * Match Center models shared by clients: the official-selection command lifecycle, the
 * Team and operator panels' commands and intents, and the score preview of a slot draft.
 * Ported from web's `apps/web/src/modules/results/presentation/*-draft.ts` and
 * `encounter-preview.ts`; copy and rendering stay in each client.
 */
export * from "./selection-command.ts";
export * from "./encounter-preview.ts";
export * from "./team-selection.ts";
export * from "./dispute-review.ts";
