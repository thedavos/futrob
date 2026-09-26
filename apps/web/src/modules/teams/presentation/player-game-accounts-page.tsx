"use client";

import { useContext, useMemo, useRef, useState } from "react";
import {
  ArrowsClockwiseIcon,
  CircleNotchIcon,
  InfoIcon,
  PencilSimpleIcon,
  PlusIcon,
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
  ScrollArea,
  ScrollAreaContent,
  Separator,
  Subtitle,
  Text,
} from "@futrob/ui";
import {
  asEaSearchPlatform,
  gamePlatformForEaSearchLogo,
  type PlayerExternalClubAssociationDto,
  type PlayerGameAccountDto,
} from "@futrob/api-contracts";
import gamepadUrl from "@/assets/gamepad.svg";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import {
  eaPlatformLabel,
  formatProviderGameEdition,
} from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { WorkspaceSelectionContext } from "@/shared/presentation/shell/workspace-selection-context.ts";
import {
  personalWorkspaceSelection,
  WORKSPACE_SELECTION_KIND,
} from "@/shared/presentation/shell/workspace-selection.ts";
import { styles } from "./player-game-accounts-page.styles.ts";
import { GameDataSetupSection } from "./player-game-data-setup-section.tsx";
import { GameDataDestinations } from "./player-game-data-destinations.tsx";
import { AddClubDialog } from "./add-club-dialog.tsx";
import { EditGameAccountDialog } from "./edit-game-account-dialog.tsx";
import { GameDataPageSkeleton } from "./player-game-accounts-skeleton.tsx";
import { useMyPlayerProfileQuery } from "./player-queries.ts";
import { platformLabel } from "./platform-label.ts";

const alert = applyStyles(styles.alert);
const setupHint = applyStyles(styles.setupHint);
const platformLogo = applyStyles(styles.platformLogo);
const clubMetaLogo = applyStyles(styles.clubMetaLogo);

export function PlayerGameAccountsPage() {
  const { t } = useI18n();
  const profileQuery = useMyPlayerProfileQuery();
  const [setupOpen, setSetupOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const accounts = profileQuery.data?.gameAccounts ?? [];
  const clubs = profileQuery.data?.externalClubs ?? [];
  const loading = profileQuery.isPending;
  const refreshing = profileQuery.isFetching && !profileQuery.isPending;
  const account = accounts[0] ?? null;
  const isEmpty = !loading && !profileQuery.isError && account === null;
  const showSetup = isEmpty || setupOpen;
  const canRefresh = account !== null && clubs.length > 0;

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>{t("player.nav.gameData")}</PageHeaderTitle>
        <PageHeaderDescription>
          {t(
            isEmpty || setupOpen
              ? "player.gameData.subtitle.empty"
              : "player.gameData.subtitle.ready",
          )}
        </PageHeaderDescription>
        {canRefresh ? (
          <PageHeaderActions>
            <Button
              disabled={refreshing}
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
        ) : null}
      </PageHeader>

      {profileQuery.isError ? (
        <Alert className={alert.className} style={alert.style} variant="destructive">
          <AlertDescription>{t("player.gameData.error")}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? <GameDataPageSkeleton /> : null}

      {showSetup ? (
        <div {...applyStyles(styles.stack)}>
          <GameDataSetupSection onActiveChange={setSetupOpen} />
          <Alert variant="info">
            <InfoIcon aria-hidden />
            <AlertDescription className={setupHint.className} style={setupHint.style}>
              {t("player.gameData.setup.hint")}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {account && !loading && !profileQuery.isError && !setupOpen ? (
        <div {...applyStyles(styles.board)}>
          <PlayerIdentifierSection account={account} onEdit={() => setEditOpen(true)} />
          <div {...applyStyles(styles.clubsRow)}>
            <AssociatedClubsSection clubs={clubs} />
            <GameDataDestinations />
          </div>
          <EditGameAccountDialog account={account} onOpenChange={setEditOpen} open={editOpen} />
        </div>
      ) : null}
    </main>
  );
}

function PlayerIdentifierSection({
  account,
  onEdit,
}: {
  readonly account: PlayerGameAccountDto;
  readonly onEdit: () => void;
}) {
  const { t } = useI18n();
  const platform = platformLabel(account.platform);
  const edition = formatProviderGameEdition(account.gameEdition);

  return (
    <Card aria-label={t("player.gameData.identifier.title")} className={styles.identifierCard}>
      <CardContent className={styles.identifierContent}>
        <div {...applyStyles(styles.identifierBar)}>
          <div {...applyStyles(styles.identifierCluster)}>
            <img alt="" data-outline="none" {...applyStyles(styles.gamepad)} src={gamepadUrl} />
            <Text as="p" look="subtitle" truncate weight="semibold">
              {account.identifier}
            </Text>
          </div>
          <div {...applyStyles(styles.metaColumn)}>
            <Separator orientation="vertical" {...applyStyles(styles.identifierDivider)} />
            <div {...applyStyles(styles.metaCluster)}>
              <PlatformLogo
                className={platformLogo.className}
                height={24}
                platform={account.platform}
                style={platformLogo.style}
                width={24}
              />
              <Text look="body" truncate weight="medium">
                {platform}
              </Text>
            </div>
          </div>
          <div {...applyStyles(styles.metaColumn)}>
            <Separator orientation="vertical" {...applyStyles(styles.identifierDivider)} />
            <Text look="body" truncate weight="medium">
              {edition}
            </Text>
          </div>
          <Button className={styles.editLink} onClick={onEdit} type="button" variant="link">
            <PencilSimpleIcon aria-hidden data-icon="inline-start" size={16} />
            {t("player.gameData.identifier.edit")}
          </Button>
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
  const [addClubOpen, setAddClubOpen] = useState(false);
  const [localClubId, setLocalClubId] = useState<string | undefined>(undefined);
  const preferredId =
    workspace?.selection.kind === WORKSPACE_SELECTION_KIND.personal
      ? workspace.selection.externalClubId
      : localClubId;
  const selectedId = selectedClubId(clubs, preferredId);
  const orderedClubs = useMemo(
    () => clubsWithSelectedFirst(clubs, selectedId),
    [clubs, selectedId],
  );
  const listRef = useRef<HTMLUListElement>(null);

  function changeClub(externalClubId: string) {
    if (workspace) {
      workspace.select(personalWorkspaceSelection(externalClubId));
    } else {
      setLocalClubId(externalClubId);
    }
    const viewport = listRef.current?.closest("[data-slot='scroll-area-viewport']");
    if (viewport instanceof HTMLElement) {
      viewport.scrollTo({ top: 0 });
    }
  }

  return (
    <Card className={styles.large}>
      <CardHeader className={styles.header}>
        <div {...applyStyles(styles.headerCopy)}>
          <Heading className={styles.title}>{t("player.gameData.clubs.title")}</Heading>
          <Subtitle>{t("player.gameData.clubs.subtitle")}</Subtitle>
        </div>
        <Button
          className={styles.headerAction}
          onClick={() => setAddClubOpen(true)}
          type="button"
          variant="ghost"
        >
          <PlusIcon aria-hidden data-icon="inline-start" size={16} />
          {t("player.gameData.clubs.associate")}
        </Button>
      </CardHeader>
      <CardContent className={styles.content}>
        {clubs.length === 0 ? (
          <Caption>{t("player.gameData.clubs.empty")}</Caption>
        ) : (
          <ScrollArea className={styles.clubScroll}>
            <ScrollAreaContent>
              <ul ref={listRef} role="list" {...applyStyles(styles.list)}>
                {orderedClubs.map((club) => {
                  const selectedClub = club.externalClubId === selectedId;
                  return (
                    <li
                      key={club.externalClubId}
                      {...applyStyles(styles.row, selectedClub && styles.rowSelected)}
                    >
                      <ClubCrestAvatar
                        className={styles.crest}
                        framed={!club.imageUrl}
                        imageUrl={club.imageUrl}
                        name={club.externalClubName}
                      />
                      <div {...applyStyles(styles.clubIdentity)}>
                        <Text className={styles.clubName} look="body" truncate weight="semibold">
                          {club.externalClubName}
                        </Text>
                        <div {...applyStyles(styles.clubMeta)}>
                          <Caption className={styles.clubMetaText} truncate>
                            {t("player.gameData.clubs.meta", { id: club.externalClubId })}
                          </Caption>
                          {clubPlatformMark(club.platform)}
                        </div>
                      </div>
                      <div {...applyStyles(styles.rowAction)}>
                        {selectedClub ? (
                          <Badge variant="primary">{t("player.gameData.clubs.selected")}</Badge>
                        ) : (
                          <Button
                            aria-label={`${t("player.gameData.clubs.change")} ${club.externalClubName}`}
                            className={styles.changeClub}
                            onClick={() => {
                              changeClub(club.externalClubId);
                            }}
                            type="button"
                            variant="link"
                          >
                            {t("player.gameData.clubs.change")}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollAreaContent>
          </ScrollArea>
        )}
      </CardContent>
      <AddClubDialog onOpenChange={setAddClubOpen} open={addClubOpen} />
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

function clubsWithSelectedFirst(
  clubs: readonly PlayerExternalClubAssociationDto[],
  selectedId: string | undefined,
): readonly PlayerExternalClubAssociationDto[] {
  if (selectedId === undefined || clubs.length < 2) return clubs;
  const selected = clubs.find((club) => club.externalClubId === selectedId);
  if (selected === undefined) return clubs;
  return [selected, ...clubs.filter((club) => club.externalClubId !== selectedId)];
}

function clubPlatformMark(platform: string) {
  const eaPlatform = asEaSearchPlatform(platform);
  if (eaPlatform === null) return null;
  return (
    <>
      <span aria-hidden {...applyStyles(styles.clubMetaDot)}>
        ·
      </span>
      <span aria-label={eaPlatformLabel(platform)}>
        <PlatformLogo
          className={clubMetaLogo.className}
          platform={gamePlatformForEaSearchLogo(eaPlatform)}
          style={clubMetaLogo.style}
        />
      </span>
    </>
  );
}
