import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { GameDataClientError } from "@/modules/game-data/presentation/game-data-browser-client.ts";
import { TeamsClientError } from "./teams-browser-client.ts";

/** Actionable, localized copy for a failed team operation; keeps the request ID for support. */
export function teamConsoleError(error: Error, t: Translator): SupportError {
  if (error instanceof TeamsClientError || error instanceof GameDataClientError) {
    return {
      message: t.error(error.code),
      requestId: error.requestId,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  return { message: t.error("fallback") };
}
