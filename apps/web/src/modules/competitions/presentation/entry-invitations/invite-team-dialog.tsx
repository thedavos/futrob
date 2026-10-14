"use client";

import * as stylex from "@stylexjs/stylex";
import type { EntryInviteeCandidateDto, GamePlatformDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ShieldPlusIcon } from "@phosphor-icons/react";
import { InviteTeamFutrobTab, type InviteTeamCaptainInput } from "./invite-team-futrob-tab.tsx";
import { InviteTeamLinkTab, type InvitationLinkState } from "./invite-team-link-tab.tsx";

export const INVITE_TEAM_TAB = { futrob: "futrob", link: "link" } as const;
export type InviteTeamTab = (typeof INVITE_TEAM_TAB)[keyof typeof INVITE_TEAM_TAB];

const styles = stylex.create({
  content: {
    maxWidth: "36rem",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    columnGap: "1rem",
    rowGap: "0.5rem",
  },
  icon: {
    width: "2.5rem",
    height: "2.5rem",
    color: colors.foreground,
  },
  headerText: {
    display: "grid",
    justifyItems: "start",
    gap: "0.5rem",
  },
  tabs: {
    marginTop: "1.25rem",
    gap: "1.25rem",
  },
  list: {
    width: "100%",
  },
  trigger: {
    flexGrow: 1,
  },
});

const content = applyStyles(styles.content);
const tabs = applyStyles(styles.tabs);
const list = applyStyles(styles.list);
const trigger = applyStyles(styles.trigger);

export interface InviteTeamDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly tab: InviteTeamTab;
  readonly onTabChange: (tab: InviteTeamTab) => void;
  readonly competitionName: string;
  readonly gameEdition: string;
  readonly platform: GamePlatformDto;
  readonly platformLabel: (platform: GamePlatformDto) => string;
  readonly searchPlayers: (query: string) => Promise<readonly EntryInviteeCandidateDto[]>;
  readonly onInvite: (input: InviteTeamCaptainInput) => Promise<void>;
  readonly link: InvitationLinkState;
  readonly onRetryLink: () => void;
  readonly onRegenerateLink: () => Promise<void>;
}

/**
 * Invite a team to a competition (ADR-0023): a Futrob player who will captain it, or the
 * competition's shareable link. Pure view; the caller owns the server state.
 */
export function InviteTeamDialog({
  open,
  onOpenChange,
  tab,
  onTabChange,
  competitionName,
  gameEdition,
  platform,
  platformLabel,
  searchPlayers,
  onInvite,
  link,
  onRetryLink,
  onRegenerateLink,
}: InviteTeamDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={content.className} style={content.style}>
        <DialogHeader>
          <div {...applyStyles(styles.header)}>
            <ShieldPlusIcon aria-hidden="true" {...applyStyles(styles.icon)} />
            <div {...applyStyles(styles.headerText)}>
              <DialogTitle>Invitar equipo</DialogTitle>
              <DialogDescription>
                Invita a un equipo a participar en {competitionName}.
              </DialogDescription>
              <Badge variant="neutral">
                {gameEdition} · {platformLabel(platform)}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        <Tabs
          className={tabs.className}
          onValueChange={(value) => {
            if (value === INVITE_TEAM_TAB.futrob || value === INVITE_TEAM_TAB.link) {
              onTabChange(value);
            }
          }}
          style={tabs.style}
          value={tab}
          variant="pills"
        >
          <TabsList aria-label="Forma de invitar" className={list.className} style={list.style}>
            <TabsTrigger
              className={trigger.className}
              style={trigger.style}
              value={INVITE_TEAM_TAB.futrob}
            >
              Equipo en Futrob
            </TabsTrigger>
            <TabsTrigger
              className={trigger.className}
              style={trigger.style}
              value={INVITE_TEAM_TAB.link}
            >
              Por enlace
            </TabsTrigger>
            <TabsIndicator />
          </TabsList>
          <TabsContent value={INVITE_TEAM_TAB.futrob}>
            <InviteTeamFutrobTab
              onInvite={onInvite}
              platformLabel={platformLabel}
              searchPlayers={searchPlayers}
            />
          </TabsContent>
          <TabsContent value={INVITE_TEAM_TAB.link}>
            <InviteTeamLinkTab link={link} onRegenerate={onRegenerateLink} onRetry={onRetryLink} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
