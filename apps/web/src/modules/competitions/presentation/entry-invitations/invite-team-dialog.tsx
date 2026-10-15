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
    columnGap: "0.75rem",
  },
  // 24 px glyph centred on the title's first line instead of towering over it.
  icon: {
    width: "1.5rem",
    height: "1.5rem",
    marginTop: "-0.125rem",
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
  // The popover surface shares `muted` with the default pills track, so sink the track and
  // raise the active pill to the dialog surface.
  list: {
    width: "100%",
    backgroundColor: colors.background,
  },
  trigger: {
    flexGrow: 1,
    backgroundColor: {
      default: "transparent",
      ":is([data-active])": colors.surfaceRaised,
    },
  },
  // `tabs.gap` already separates the list; the dialog padding closes the panel.
  panel: {
    paddingBlock: 0,
  },
});

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
      <DialogContent className={styles.content}>
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
          className={styles.tabs}
          onValueChange={(value) => {
            if (value === INVITE_TEAM_TAB.futrob || value === INVITE_TEAM_TAB.link) {
              onTabChange(value);
            }
          }}
          value={tab}
          variant="pills"
        >
          <TabsList aria-label="Forma de invitar" className={styles.list}>
            <TabsTrigger className={styles.trigger} value={INVITE_TEAM_TAB.futrob}>
              Equipo en Futrob
            </TabsTrigger>
            <TabsTrigger className={styles.trigger} value={INVITE_TEAM_TAB.link}>
              Por enlace
            </TabsTrigger>
            <TabsIndicator />
          </TabsList>
          <TabsContent className={styles.panel} value={INVITE_TEAM_TAB.futrob}>
            <InviteTeamFutrobTab
              onInvite={onInvite}
              platformLabel={platformLabel}
              searchPlayers={searchPlayers}
            />
          </TabsContent>
          <TabsContent className={styles.panel} value={INVITE_TEAM_TAB.link}>
            <InviteTeamLinkTab link={link} onRegenerate={onRegenerateLink} onRetry={onRetryLink} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
