"use client";

import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
  Skeleton,
  typography,
  vis,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { Link } from "@tanstack/react-router";
import { asEaSearchPlatform, gamePlatformForEaSearchLogo } from "@futrob/api-contracts";
import type { PlayerExternalClubAssociationDto } from "@futrob/api-contracts";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";
import { EaLogo } from "@/shared/presentation/ea-logo.tsx";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import {
  eaPlatformLabel,
  formatProviderGameEdition,
} from "@/modules/identity/presentation/onboarding/onboarding-step-meta.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useMyPlayerProfileQuery } from "./player-queries.ts";

const styles = stylex.create({
  main: {
    width: "100%",
  },
  body: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  card: {
    display: "flex",
    flexDirection: {
      default: "column",
      [media.sm]: "row",
    },
    alignItems: {
      default: null,
      [media.sm]: "flex-start",
    },
    gap: {
      default: "1.5rem",
      [media.sm]: "2rem",
    },
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    padding: {
      default: "1.5rem",
      [media.sm]: "2rem",
    },
  },
  avatar: {
    width: "5rem",
    height: "5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
    outlineWidth: 1,
    outlineStyle: "solid",
    outlineOffset: -1,
    outlineColor: "color-mix(in oklab, var(--foreground) 10%, transparent)",
  },
  fallback: {
    fontSize: "1.125rem",
    lineHeight: "1.75rem",
  },
  details: {
    display: "grid",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    gap: "1.25rem",
  },
  identity: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  name: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "1.25rem",
    lineHeight: 1.375,
    fontWeight: 600,
  },
  meta: {
    color: colors.mutedForeground,
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
  },
  chipIcon: {
    width: "0.875rem",
    height: "0.875rem",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
  },
  nameBone: {
    width: "10rem",
    maxWidth: "100%",
    height: "1.75rem",
  },
  metaBone: {
    width: "14rem",
    maxWidth: "100%",
    height: "1rem",
  },
  chipBone: {
    width: "5.5rem",
    height: "1.5rem",
    borderRadius: "var(--corner-full)",
  },
  chipBoneShort: {
    width: "4rem",
    height: "1.5rem",
    borderRadius: "var(--corner-full)",
  },
});

const avatar = applyStyles(styles.avatar);
const fallback = applyStyles(styles.fallback);
const chipIcon = applyStyles(styles.chipIcon);

export function PlayerEaClubsPage() {
  const { t } = useI18n();
  const profileQuery = useMyPlayerProfileQuery();
  const clubs = profileQuery.data?.externalClubs ?? [];

  return (
    <main {...applyStyles(styles.main)}>
      <PageHeader>
        <PageHeaderTitle>Clubes EA</PageHeaderTitle>
        <PageHeaderDescription>
          Consulta los clubes de EA vinculados a tu perfil.
        </PageHeaderDescription>
      </PageHeader>

      <span role="status" {...applyStyles(vis.srOnly)}>
        {profileQuery.isPending ? t("player.eaClubs.loading") : ""}
      </span>

      <div {...applyStyles(styles.body)}>
        {profileQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudieron cargar los clubes. Comprueba la conexión e inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}

        <div aria-busy={profileQuery.isPending || undefined} {...applyStyles(styles.stack)}>
          {profileQuery.isPending ? (
            <AssociatedClubsSkeleton />
          ) : clubs.length > 0 ? (
            clubs.map((club) => <AssociatedClub club={club} key={club.externalClubId} />)
          ) : (
            <EmptyState>
              <EmptyStateTitle>Sin clubes asociados</EmptyStateTitle>
              <EmptyStateDescription>
                Usa Añadir club en el selector de contexto para vincular un club de EA a tu perfil.
              </EmptyStateDescription>
              <EmptyStateActions>
                <Button render={<Link to="/player" />} variant="secondary">
                  Ir al espacio personal
                </Button>
              </EmptyStateActions>
            </EmptyState>
          )}
        </div>
      </div>
    </main>
  );
}

const SKELETON_CARD_COUNT = 3;

function AssociatedClubsSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <AssociatedClubSkeleton key={index} />
      ))}
    </>
  );
}

function AssociatedClubSkeleton() {
  return (
    <div {...applyStyles(styles.card)}>
      <Skeleton className={styles.avatar} />
      <div {...applyStyles(styles.details)}>
        <div {...applyStyles(styles.identity)}>
          <Skeleton className={styles.nameBone} />
          <Skeleton className={styles.metaBone} />
        </div>
        <div {...applyStyles(styles.chips)}>
          <Skeleton className={styles.chipBone} />
          <Skeleton className={styles.chipBoneShort} />
        </div>
      </div>
    </div>
  );
}

function AssociatedClub({ club }: { readonly club: PlayerExternalClubAssociationDto }) {
  const eaPlatform = asEaSearchPlatform(club.platform);

  return (
    <section aria-label={club.externalClubName} {...applyStyles(styles.card)}>
      <Avatar className={avatar.className} style={avatar.style}>
        {club.imageUrl ? (
          <AvatarImage alt="" referrerPolicy="no-referrer" src={club.imageUrl} />
        ) : null}
        <AvatarFallback className={fallback.className} style={fallback.style}>
          {initialsFromName(club.externalClubName)}
        </AvatarFallback>
      </Avatar>

      <div {...applyStyles(styles.details)}>
        <div {...applyStyles(styles.identity)}>
          <h2 {...applyStyles(styles.name)}>{club.externalClubName}</h2>
          <p {...applyStyles(typography.caption, styles.meta)}>
            ID {club.externalClubId}
            {club.associatedAt ? ` · Asociado el ${formatAssociatedDate(club.associatedAt)}` : null}
          </p>
        </div>

        <div {...applyStyles(styles.chips)}>
          <Badge variant="outline">
            {eaPlatform ? (
              <PlatformLogo
                className={chipIcon.className}
                platform={gamePlatformForEaSearchLogo(eaPlatform)}
                style={chipIcon.style}
              />
            ) : null}
            {eaPlatformLabel(club.platform)}
          </Badge>
          <Badge variant="outline">
            <EaLogo className={chipIcon.className} style={chipIcon.style} />
            {formatProviderGameEdition(club.gameEdition)}
          </Badge>
        </div>
      </div>
    </section>
  );
}

function formatAssociatedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
