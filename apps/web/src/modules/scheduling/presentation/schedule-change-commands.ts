import { useRef } from "react";
import type { FutrobApiError } from "@futrob/sdk";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export type ScheduleChangeCommand = "create" | "accept" | "reject" | "counter";

/**
 * What a form does after a command fails. The list is reread either way: `close` drops the
 * draft and explains on the request, `keep` leaves it (and its command key) for a retry.
 */
export interface CommandRecovery {
  readonly draft: "close" | "keep";
  readonly field: "date" | null;
  readonly message: { readonly key: ParameterlessMessageKey } | { readonly code: string };
}

type Anchor = "current" | "proposed" | undefined;
type Rule = (command: ScheduleChangeCommand, anchor: Anchor) => CommandRecovery;

const close =
  (key: ParameterlessMessageKey): Rule =>
  () => ({ draft: "close", field: null, message: { key } });
const review = close("reschedule.recovery.review");
const permission = close("reschedule.recovery.permission");
const hasDateField = (command: ScheduleChangeCommand) =>
  command === "create" || command === "counter";

const rules = new Map<string, Rule>([
  ["scheduling.schedule_change_version_conflict", review],
  ["scheduling.schedule_change_concurrency_conflict", review],
  ["scheduling.schedule_change_proposal_stale", review],
  ["scheduling.schedule_change_request_closed", review],
  ["scheduling.schedule_change_consent_already_recorded", review],
  ["scheduling.active_schedule_change_request_exists", close("reschedule.recovery.activeRequest")],
  ["scheduling.schedule_change_response_window_closed", close("reschedule.recovery.windowClosed")],
  [
    "scheduling.encounter_not_editable_for_schedule_change",
    close("reschedule.recovery.resultProtected"),
  ],
  ["scheduling.rescheduling_disabled", close("reschedule.recovery.disabled")],
  ["scheduling.reschedule_limit_reached", close("reschedule.recovery.limitReached")],
  ["scheduling.schedule_change_authority_not_required", permission],
  ["scheduling.schedule_change_self_response_forbidden", permission],
  ["authorization.forbidden", permission],
  [
    "scheduling.reschedule_notice_not_met",
    (command, anchor) =>
      anchor === "current"
        ? { draft: "close", field: null, message: { key: "reschedule.recovery.noticeCurrent" } }
        : hasDateField(command)
          ? { draft: "keep", field: "date", message: { key: "reschedule.recovery.noticeProposed" } }
          : { draft: "close", field: null, message: { key: "reschedule.recovery.acceptNotice" } },
  ],
  [
    "scheduling.invalid_schedule_change_date",
    (command) =>
      hasDateField(command)
        ? { draft: "keep", field: "date", message: { key: "reschedule.recovery.dateRejected" } }
        : { draft: "close", field: null, message: { key: "reschedule.recovery.acceptPast" } },
  ],
]);

/** `null` stands for a failure with no API answer, such as a dropped connection. */
export function recoverFrom(
  error: FutrobApiError | null,
  command: ScheduleChangeCommand,
): CommandRecovery {
  if (!error) {
    return { draft: "keep", field: null, message: { key: "reschedule.recovery.network" } };
  }
  const rule = rules.get(error.code);
  if (rule) return rule(command, error.details?.anchor);
  return { draft: "keep", field: null, message: { code: error.code } };
}

export function recoveryText(recovery: CommandRecovery, t: Translator): string {
  return "key" in recovery.message ? t(recovery.message.key) : t.error(recovery.message.code);
}

/** One key per payload, so a retry of the same command replays instead of applying twice. */
export function useCommandKey<Payload extends object>(): (payload: Payload) => string {
  const last = useRef<{ fingerprint: string; key: string } | null>(null);
  return (payload) => {
    const fingerprint = JSON.stringify(payload);
    if (last.current?.fingerprint !== fingerprint) {
      last.current = { fingerprint, key: crypto.randomUUID() };
    }
    return last.current.key;
  };
}
