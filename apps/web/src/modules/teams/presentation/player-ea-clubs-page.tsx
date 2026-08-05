"use client";

import {
  Alert,
  AlertDescription,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  Button,
} from "@futrob/ui";
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
import { useMyPlayerProfileQuery } from "./player-queries.ts";

export function PlayerEaClubsPage() {
  const profileQuery = useMyPlayerProfileQuery();
  const club = profileQuery.data?.externalClub ?? null;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="space-y-3">
        {club ? <p className="typo-label text-muted-foreground">{club.externalClubName}</p> : null}
        <div className="space-y-3">
          <h1 className="typo-heading">Clubes EA</h1>
          <p className="typo-subtitle max-w-xl text-muted-foreground">
            Consulta el club de EA Clubs vinculado a tu perfil.
          </p>
        </div>
      </header>

      <div className="mt-12 space-y-8">
        {profileQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudo cargar el club. Comprueba la conexión e inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : null}

        {profileQuery.isPending ? (
          <p className="typo-caption text-muted-foreground">Cargando club…</p>
        ) : club ? (
          <AssociatedClub club={club} />
        ) : (
          <EmptyState>
            <EmptyStateTitle>Sin club asociado</EmptyStateTitle>
            <EmptyStateDescription>
              Asocia un club de EA Clubs durante el onboarding para localizar partidos y
              estadísticas.
            </EmptyStateDescription>
            <EmptyStateActions>
              <Button render={<Link to="/player" />} variant="secondary">
                Ir al espacio personal
              </Button>
            </EmptyStateActions>
          </EmptyState>
        )}
      </div>
    </main>
  );
}

function AssociatedClub({ club }: { readonly club: PlayerExternalClubAssociationDto }) {
  const eaPlatform = asEaSearchPlatform(club.platform);

  return (
    <section
      aria-label={club.externalClubName}
      className="flex flex-col gap-6 rounded-xl border border-border-subtle bg-surface p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8"
    >
      <Avatar className="size-20 shrink-0 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
        {club.imageUrl ? <AvatarImage alt="" src={club.imageUrl} /> : null}
        <AvatarFallback className="text-lg">
          {initialsFromName(club.externalClubName)}
        </AvatarFallback>
      </Avatar>

      <div className="grid min-w-0 flex-1 gap-5">
        <div className="space-y-2">
          <h2 className="min-w-0 truncate text-xl font-semibold leading-snug">
            {club.externalClubName}
          </h2>
          <p className="typo-caption text-muted-foreground">
            ID {club.externalClubId}
            {club.associatedAt ? ` · Asociado el ${formatAssociatedDate(club.associatedAt)}` : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">
            {eaPlatform ? (
              <PlatformLogo
                className="size-3.5"
                platform={gamePlatformForEaSearchLogo(eaPlatform)}
              />
            ) : null}
            {eaPlatformLabel(club.platform)}
          </Badge>
          <Badge variant="outline">
            <EaLogo className="size-3.5" />
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
