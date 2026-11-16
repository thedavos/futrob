import { useSyncExternalStore } from "react";
import { getSessionGeneration, type SessionGeneration } from "@/modules/identity/session-store";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";

/**
 * The EA club the player last chose for the personal space, kept for this session only
 * (design.md: «Visitas posteriores pueden recordar la última selección en el cliente»). Every
 * personal tab reads it, so switching tabs never changes the club. A new session starts empty.
 */
let remembered: { readonly generation: SessionGeneration; readonly clubId: string } | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const read = () => remembered;

export function rememberPersonalClub(clubId: string) {
  remembered = { generation: getSessionGeneration(), clubId };
  for (const listener of listeners) listener();
}

/** The club this session last chose, if any. */
export function useRememberedPersonalClub(): string | undefined {
  const generation = useSessionGeneration();
  const current = useSyncExternalStore(subscribe, read, read);
  return current?.generation === generation ? current.clubId : undefined;
}
