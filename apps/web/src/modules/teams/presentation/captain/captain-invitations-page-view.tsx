"use client";

import type { CompetitionTeamManagementDetailResponse } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  TextLink,
} from "@futrob/ui";
import { LinkIcon } from "@phosphor-icons/react";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { SupportError } from "@/shared/presentation/support-error-alert.tsx";
import { InvitationDialog, type CreateInvitationInput } from "../competition-team-actions.tsx";
import { InvitationLinkPanel } from "../invitation-link-panel.tsx";
import { CaptainEntryClosedAlert } from "./captain-entry-closed-alert.tsx";
import type { CaptainLinks } from "./captain-links.tsx";
import { CaptainPageFrame } from "./captain-page-frame.tsx";
import { CaptainRosterStats } from "./captain-roster-stats.tsx";
import { isRosterWritable, type CaptainTeamAccess } from "./captain-team-access.ts";
import type { CaptainCapabilities } from "./use-captain-team.ts";

export type CaptainInvitationsPageViewProps = {
  readonly access: CaptainTeamAccess;
  readonly capabilities: CaptainCapabilities;
  readonly detail: CompetitionTeamManagementDetailResponse | null;
  readonly error: SupportError | null;
  readonly busy?: boolean;
  /** Last link created on this page; the API does not list a team's sent invitations yet. */
  readonly invitationUrl: string | null;
  readonly links: CaptainLinks;
  readonly onRetry: () => void;
  readonly onRetryDetail: () => void;
  readonly onCreateInvitation: (input: CreateInvitationInput) => Promise<void>;
};

export function CaptainInvitationsPageView(props: CaptainInvitationsPageViewProps) {
  const { capabilities, detail } = props;
  const writable = detail ? isRosterWritable(detail.entry.status) : false;
  return (
    <CaptainPageFrame
      access={props.access}
      actions={
        detail ? (
          <InvitationDialog
            allowedRoles={capabilities.manageRoles ? undefined : ["player"]}
            busy={props.busy}
            disabled={!writable}
            invitationUrl={props.invitationUrl}
            onCreateInvitation={props.onCreateInvitation}
          />
        ) : null
      }
      detail={detail}
      error={props.error}
      forbiddenKey="captain.forbidden.invitations"
      links={props.links}
      onRetry={props.onRetry}
      onRetryDetail={props.onRetryDetail}
      page="captain.invitations"
    >
      {(loaded) => <InvitationsContent {...props} detail={loaded} writable={writable} />}
    </CaptainPageFrame>
  );
}

function InvitationsContent({
  detail,
  capabilities,
  invitationUrl,
  links,
  writable,
}: CaptainInvitationsPageViewProps & {
  readonly detail: CompetitionTeamManagementDetailResponse;
  readonly writable: boolean;
}) {
  const { t } = useI18n();
  const full = detail.roster.memberCount >= detail.roster.maxSize;
  return (
    <>
      {!writable ? (
        <CaptainEntryClosedAlert />
      ) : detail.roster.state === "closed" ? (
        <Alert>
          <AlertTitle>{t("captain.invitations.closed.title")}</AlertTitle>
          <AlertDescription>
            {t("captain.invitations.closed.description")}{" "}
            {capabilities.manageRoster ? (
              <TextLink render={links.roster}>{t("captain.invitations.closed.action")}</TextLink>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : full ? (
        <Alert>
          <AlertTitle>{t("captain.invitations.full.title")}</AlertTitle>
          <AlertDescription>{t("captain.invitations.full.description")}</AlertDescription>
        </Alert>
      ) : null}
      <CaptainRosterStats detail={detail} />
      {invitationUrl ? (
        <InvitationLinkPanel showDescription url={invitationUrl} />
      ) : (
        <EmptyState>
          <EmptyStateIcon>
            <LinkIcon />
          </EmptyStateIcon>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("captain.invitations.empty.title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("captain.invitations.empty.description")}
            </EmptyStateDescription>
          </EmptyStateCopy>
        </EmptyState>
      )}
    </>
  );
}
