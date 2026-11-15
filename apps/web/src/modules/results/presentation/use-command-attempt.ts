import { useRef } from "react";
import {
  beginAttempt,
  type Attempt,
  type CommandOutcome,
  type LifecycleEvent,
  type Submission,
} from "./selection-draft.ts";

/**
 * Sends an intent as at most one attempt at a time. The ref closes the gap between a
 * second click and the render that disables the button; the draft decides the key.
 */
export function useCommandAttempt<Command extends string, Intent>(
  dispatch: (event: LifecycleEvent<Command, Intent>) => void,
) {
  const inFlight = useRef(false);
  return function send(
    submission: Submission<Intent>,
    intent: Intent,
    readVersion: number,
    submit: (attempt: Attempt<Intent>) => Promise<CommandOutcome>,
  ) {
    if (inFlight.current) return;
    const attempt = beginAttempt(submission, intent, readVersion, crypto.randomUUID());
    if (!attempt) return;
    inFlight.current = true;
    dispatch({ type: "started", attempt });
    void submit(attempt)
      .catch((): CommandOutcome => ({ ok: false, failure: "unknown", code: null }))
      .then((outcome) => {
        inFlight.current = false;
        dispatch({ type: "settled", outcome });
      });
  };
}
