"use client";

import { useContext, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowsClockwiseIcon,
  CircleNotchIcon,
  GameControllerIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  Caption,
  Card,
  CardContent,
  CardHeader,
  Heading,
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
  Subtitle,
  Text,
} from "@futrob/ui";
import type { PlayerExternalClubAssociationDto, PlayerGameAccountDto } from "@futrob/api-contracts";
import gamepadUrl from "@/assets/gamepad.svg";
import { EaLogo } from "@/shared/presentation/ea-logo.tsx";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { WorkspaceSelectionContext } from "@/shared/presentation/shell/workspace-selection-context.ts";
import {
  personalWorkspaceSelection,
  WORKSPACE_SELECTION_KIND,
} from "@/shared/presentation/shell/workspace-selection.ts";
import { styles } from "./player-game-accounts-page.styles.ts";
import { useMyPlayerProfileQuery } from "./player-queries.ts";
import { platformLabel } from "./platform-label.ts";

const alert = applyStyles(styles.alert);
const platformLogo = applyStyles(styles.platformLogo);
const primary = applyStyles(styles.primary);
const eaMark = applyStyles(styles.eaMark);

export function PlayerGameAccountsPage() {
  const { t } = useI18n();
  const profileQuery = useMyPlayerProfileQuery();
  const accounts = profileQuery.data?.gameAccounts ?? [];
  const clubs = profileQuery.data?.externalClubs ?? [];
  const loading = profileQuery.isPending;
  const refreshing = profileQuery.isFetching && !profileQuery.isPending;
  const account = accounts[0] ?? null;
  const isEmpty = !loading && !profileQuery.isError && account === null;

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("player.nav.gameData")}</PageHeaderTitle>
        <PageHeaderDescription>
          {t(isEmpty ? "player.gameData.subtitle.empty" : "player.gameData.subtitle.ready")}
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button
            disabled={loading || refreshing}
            onClick={() => {
              void profileQuery.refetch();
            }}
            type="button"
          >
            {refreshing ? (
              <CircleNotchIcon
                aria-hidden
                data-icon="inline-start"
                size={16}
                {...applyStyles(styles.spinner)}
              />
            ) : (
              <ArrowsClockwiseIcon aria-hidden data-icon="inline-start" size={16} />
            )}
            {refreshing ? t("player.gameData.refreshing") : t("player.gameData.refresh")}
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {profileQuery.isError ? (
        <Alert className={alert.className} style={alert.style} variant="destructive">
          <AlertDescription>{t("player.gameData.error")}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <Caption {...applyStyles(styles.loading)}>{t("player.gameData.loading")}</Caption>
      ) : null}

      {isEmpty ? (
        <div {...applyStyles(styles.stack)}>
          <GameDataSetupSection />
          <Alert variant="info">
            <InfoIcon aria-hidden />
            <AlertDescription>{t("player.gameData.setup.hint")}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {account && !loading && !profileQuery.isError ? (
        <div {...applyStyles(styles.board)}>
          <PlayerIdentifierSection account={account} />
          <AssociatedClubsSection clubs={clubs} />
        </div>
      ) : null}
    </main>
  );
}

function GameDataSetupSection() {
  const { t } = useI18n();

  return (
    <Card className={styles.setup}>
      <CardContent className={styles.setupContent}>
        <img alt="" data-outline="none" src={gamepadUrl} {...applyStyles(styles.setupGamepad)} />
        <div {...applyStyles(styles.setupCopy)}>
          <Heading className={styles.title}>{t("player.gameData.setup.title")}</Heading>
          <Subtitle>{t("player.gameData.setup.subtitle")}</Subtitle>
        </div>
        <Button type="button">
          <GameControllerIcon aria-hidden data-icon="inline-start" size={16} />
          {t("player.gameData.setup.cta")}
        </Button>
      </CardContent>
    </Card>
  );
}

function PlayerIdentifierSection({ account }: { readonly account: PlayerGameAccountDto }) {
  const { t } = useI18n();

  return (
    <Card className={styles.large}>
      <CardHeader className={styles.header}>
        <Heading className={styles.title}>{t("player.gameData.identifier.title")}</Heading>
      </CardHeader>
      <CardContent className={styles.content}>
        <div {...applyStyles(styles.identity)}>
          <div {...applyStyles(styles.identityRow)}>
            <img alt="" {...applyStyles(styles.gamepad)} src={gamepadUrl} />
            <Text as="p" look="subtitle" truncate weight="semibold">
              {account.identifier}
            </Text>
          </div>
          <div {...applyStyles(styles.platformRow)}>
            <Text look="label" tone="muted">
              {t("player.gameData.platform")}
            </Text>
            <span role="img" aria-label={platformLabel(account.platform)}>
              <PlatformLogo
                className={platformLogo.className}
                height={24}
                platform={account.platform}
                style={platformLogo.style}
                width={24}
              />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssociatedClubsSection({
  clubs,
}: {
  readonly clubs: readonly PlayerExternalClubAssociationDto[];
}) {
  const { t } = useI18n();
  const workspace = useContext(WorkspaceSelectionContext);
  const [localClubId, setLocalClubId] = useState<string | undefined>(undefined);
  const preferredId =
    workspace?.selection.kind === WORKSPACE_SELECTION_KIND.personal
      ? workspace.selection.externalClubId
      : localClubId;
  const selectedId = selectedClubId(clubs, preferredId);
  const selected = clubs.find((club) => club.externalClubId === selectedId) ?? null;

  function changeClub(externalClubId: string) {
    if (workspace) {
      workspace.select(personalWorkspaceSelection(externalClubId));
      return;
    }
    setLocalClubId(externalClubId);
  }

  return (
    <Card className={styles.large}>
      <CardHeader className={styles.header}>
        <Heading className={styles.title}>{t("player.gameData.clubs.title")}</Heading>
        <Subtitle>{t("player.gameData.clubs.subtitle")}</Subtitle>
      </CardHeader>
      <CardContent className={styles.content}>
        {clubs.length === 0 ? (
          <Caption>{t("player.gameData.clubs.empty")}</Caption>
        ) : (
          <ul {...applyStyles(styles.list)}>
            {clubs.map((club) => {
              const selectedClub = club.externalClubId === selectedId;
              return (
                <li key={club.externalClubId} {...applyStyles(styles.row)}>
                  <ClubCrestAvatar
                    className={styles.crest}
                    imageUrl={club.imageUrl}
                    name={club.externalClubName}
                  />
                  <Text className={styles.clubName} look="body" truncate weight="semibold">
                    {club.externalClubName}
                  </Text>
                  <div {...applyStyles(styles.rowAction)}>
                    {selectedClub ? (
                      <Badge variant="primary">{t("player.gameData.clubs.selected")}</Badge>
                    ) : (
                      <Button
                        aria-label={`${t("player.gameData.clubs.change")} ${club.externalClubName}`}
                        onClick={() => {
                          changeClub(club.externalClubId);
                        }}
                        type="button"
                        variant="outline"
                      >
                        {t("player.gameData.clubs.change")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {selected ? (
          <div {...applyStyles(styles.footer)}>
            <Button
              className={primary.className}
              render={<Link to="/player/matches" />}
              style={primary.style}
            >
              <EaLogo
                className={eaMark.className}
                data-icon="inline-start"
                height={16}
                style={eaMark.style}
                width={16}
              />
              {selected.externalClubName} · {selected.externalClubId}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function selectedClubId(
  clubs: readonly PlayerExternalClubAssociationDto[],
  preferredId: string | undefined,
): string | undefined {
  if (clubs.length === 0) return undefined;
  if (preferredId !== undefined && clubs.some((club) => club.externalClubId === preferredId)) {
    return preferredId;
  }
  return clubs[0]?.externalClubId;
}
