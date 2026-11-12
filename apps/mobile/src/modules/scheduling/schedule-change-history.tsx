import { View } from "react-native";
import type { ScheduleChangeRequestDto } from "@futrob/api-contracts";
import { theme } from "@/theme/theme";
import { Text } from "@/ui";
import type { RescheduleCopy } from "./reschedule-copy";

/** Proposals, decisions, expiry, resolution and the applied schedule, oldest first (web's history). */
export function ScheduleChangeHistory({
  request,
  copy,
  at,
  teamName,
}: {
  readonly request: ScheduleChangeRequestDto;
  readonly copy: RescheduleCopy;
  readonly at: (instant: string) => string;
  readonly teamName: (teamId: string) => string;
}) {
  const entry = {
    gap: theme.spacing[1],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  } as const;
  return (
    <View style={{ gap: theme.spacing[3] }}>
      {request.proposals.map((proposal, index) => (
        <View key={proposal.id} style={entry}>
          <Text role="label">
            {`${copy.proposal(index + 1)} · ${copy.proposedBy(teamName(proposal.proposedByTeamId))}`}
          </Text>
          <Text role="caption" color="muted-foreground">
            {at(proposal.createdAt)}
          </Text>
          <Text>{`${copy.proposedStart}: ${at(proposal.proposedStartAt)}`}</Text>
          <Text role="caption" color="muted-foreground">
            {copy.deadline(at(proposal.responseDeadline))}
          </Text>
          <Text color="muted-foreground">{proposal.reason}</Text>
          {request.decisions
            .filter((decision) => decision.proposalId === proposal.id)
            .map((decision) => {
              const actor =
                decision.responder.authority === "organizer"
                  ? copy.organizer
                  : teamName(decision.responder.teamId);
              return (
                <View key={decision.id} style={{ gap: theme.spacing[1] }}>
                  <Text>
                    {decision.kind === "consent" ? copy.consent(actor) : copy.rejection(actor)}
                  </Text>
                  <Text role="caption" color="muted-foreground">
                    {at(decision.createdAt)}
                  </Text>
                  {decision.reason ? <Text color="muted-foreground">{decision.reason}</Text> : null}
                </View>
              );
            })}
        </View>
      ))}
      {request.actions.map((action) => (
        <View key={action.id} style={entry}>
          {action.kind === "schedule_change_expired" ? (
            <>
              <Text color="warning">
                {copy.expiredAt(at(action.responseDeadline), at(action.processedAt))}
              </Text>
              <Text role="caption" color="muted-foreground">
                {copy.system}
              </Text>
            </>
          ) : (
            <>
              <Text>{copy.resolvedAt(at(action.processedAt), copy.organizer)}</Text>
              {action.resolution ? (
                <>
                  <Text role="label">{copy.outcomes[action.resolution.outcome]}</Text>
                  <Text color="muted-foreground">{action.resolution.reason}</Text>
                  {action.resolution.outcome === "schedule_set" ? (
                    <Text>{`${copy.newStart}: ${at(action.resolution.proposedStartAt)}`}</Text>
                  ) : null}
                  {action.resolution.outcome === "walkover_intended" ? (
                    <>
                      <Text>
                        {`${copy.winningTeam}: ${teamName(action.resolution.winningTeamId)}`}
                      </Text>
                      <Text role="caption" color="muted-foreground">
                        {copy.outcomeHelp.walkover_intended}
                      </Text>
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </View>
      ))}
      {request.application ? (
        <View style={entry}>
          {request.application.slots.map((slot) => (
            <Text key={slot.officialSlot}>
              {`${copy.scopeSlot(slot.officialSlot)}: ${at(slot.previousStartAt)} → ${at(slot.appliedStartAt)}`}
            </Text>
          ))}
          <Text role="caption" color="muted-foreground">
            {at(request.application.appliedAt)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
