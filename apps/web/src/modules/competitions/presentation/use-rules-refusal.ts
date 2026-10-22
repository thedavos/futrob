import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { CompetitionsClientError } from "./competitions-browser-client.ts";

export type RulesRefusal = "forbidden" | "not_found";

type Remembered = { readonly refusal: RulesRefusal; readonly dataUpdatedAt: number };

function refusalOf(error: Error | null): RulesRefusal | null {
  if (!(error instanceof CompetitionsClientError)) return null;
  if (error.status === 401 || error.status === 403) return "forbidden";
  return error.status === 404 ? "not_found" : null;
}

/**
 * A refusal stays authoritative for its scope until the query holds data fetched after it, so a
 * later transient error cannot bring back the payload cached before the refusal. Remembered
 * per scope key; the shared query key and its cache are left untouched.
 */
export function useRulesRefusal(
  scopeKey: string,
  query: Pick<UseQueryResult<unknown>, "isError" | "error" | "dataUpdatedAt">,
): RulesRefusal | null {
  const [remembered, setRemembered] = useState<Readonly<Record<string, Remembered>>>({});
  const observed = query.isError ? refusalOf(query.error) : null;
  const stored = remembered[scopeKey];
  if (observed && (stored?.refusal !== observed || stored.dataUpdatedAt !== query.dataUpdatedAt)) {
    setRemembered({
      ...remembered,
      [scopeKey]: { refusal: observed, dataUpdatedAt: query.dataUpdatedAt },
    });
  }
  if (observed) return observed;
  return stored && stored.dataUpdatedAt === query.dataUpdatedAt ? stored.refusal : null;
}
