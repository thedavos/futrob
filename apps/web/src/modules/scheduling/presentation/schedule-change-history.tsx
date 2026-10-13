import type { ScheduleChangeRequestDto } from "@futrob/api-contracts";
import { applyStyles, Caption, Text } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./schedule-changes.styles.ts";

export function ScheduleChangeHistory({
  request,
  format,
  teamName,
}: {
  readonly request: ScheduleChangeRequestDto;
  readonly format: Intl.DateTimeFormat;
  readonly teamName: (id: string) => string;
}) {
  const { t } = useI18n();
  const at = (value: string) => format.format(new Date(value));
  return (
    <div {...applyStyles(styles.history)}>
      {request.proposals.map((proposal, index) => (
        <div key={proposal.id} {...applyStyles(styles.meta)}>
          <Text tone="default" weight="medium">
            {t("reschedule.proposal", { number: index + 1 })} ·{" "}
            {t("reschedule.proposedBy", { team: teamName(proposal.proposedByTeamId) })}
          </Text>
          <Caption>
            <time dateTime={proposal.createdAt}>{at(proposal.createdAt)}</time> ·{" "}
            {proposal.proposedByActorId}
          </Caption>
          <Text>
            {t("reschedule.proposedStart")}:{" "}
            <time dateTime={proposal.proposedStartAt}>{at(proposal.proposedStartAt)}</time>
          </Text>
          <Caption>{t("reschedule.deadline", { date: at(proposal.responseDeadline) })}</Caption>
          <Text className={styles.reason}>{proposal.reason}</Text>
          {request.decisions
            .filter((decision) => decision.proposalId === proposal.id)
            .map((decision) => (
              <div key={decision.id} {...applyStyles(styles.meta)}>
                <Text>
                  {t(decision.kind === "consent" ? "reschedule.consent" : "reschedule.rejection", {
                    actor:
                      decision.responder.authority === "organizer"
                        ? t("reschedule.organizer")
                        : teamName(decision.responder.teamId),
                  })}
                </Text>
                <Caption>
                  <time dateTime={decision.createdAt}>{at(decision.createdAt)}</time> ·{" "}
                  {decision.actorId}
                </Caption>
                {decision.reason ? <Text className={styles.reason}>{decision.reason}</Text> : null}
              </div>
            ))}
        </div>
      ))}
      {request.actions.map((action) => (
        <div key={action.id} {...applyStyles(styles.meta)}>
          {action.kind === "schedule_change_expired" ? (
            <>
              <Text className={styles.warning}>
                {t("reschedule.expiredAt", {
                  deadline: at(action.responseDeadline),
                  processed: at(action.processedAt),
                })}
              </Text>
              <Caption>
                {t("reschedule.system")} · {action.actorId}
              </Caption>
            </>
          ) : (
            <>
              <Text>
                {t("reschedule.resolvedAt", {
                  date: at(action.processedAt),
                  actor: action.actorId,
                })}
              </Text>
              {action.resolution ? (
                <>
                  <Text tone="default" weight="medium">
                    {t(`reschedule.outcome.${action.resolution.outcome}`)}
                  </Text>
                  <Text className={styles.reason}>{action.resolution.reason}</Text>
                  {action.resolution.outcome === "schedule_set" ? (
                    <Text>
                      {t("reschedule.newStart")}:{" "}
                      <time dateTime={action.resolution.proposedStartAt}>
                        {at(action.resolution.proposedStartAt)}
                      </time>
                    </Text>
                  ) : null}
                  {action.resolution.outcome === "walkover_intended" ? (
                    <>
                      <Text>
                        {t("reschedule.winningTeam")}: {teamName(action.resolution.winningTeamId)}
                      </Text>
                      <Caption>{t("reschedule.walkoverHelp")}</Caption>
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
      ))}
      {request.application ? (
        <div {...applyStyles(styles.meta)}>
          {request.application.slots.map((slot) => (
            <Text key={slot.officialSlot}>
              {t("reschedule.scope.slot", { slot: slot.officialSlot })}: {at(slot.previousStartAt)}{" "}
              → {at(slot.appliedStartAt)}
            </Text>
          ))}
          <Caption>
            <time dateTime={request.application.appliedAt}>
              {at(request.application.appliedAt)}
            </time>{" "}
            · {request.application.appliedByActorId}
          </Caption>
        </div>
      ) : null}
    </div>
  );
}
