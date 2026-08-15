"use client";

import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { EaLogo } from "@/shared/presentation/ea-logo.tsx";
import { commandBarIdentityLabel, type CommandBarIdentity } from "./command-bar-identity.ts";

/** Ink bounds of `EaLogo` (24×24 viewBox), cropped so the wordmark can size to cap-height. */
const EA_WORDMARK_VIEW_BOX = "0 6 24 12";

export function CommandBarIdentityMark({
  emptyLabel,
  identity,
  ready = true,
}: {
  readonly emptyLabel: string;
  readonly identity: CommandBarIdentity;
  readonly ready?: boolean;
}) {
  const label = commandBarIdentityLabel(identity, emptyLabel);
  if (!ready) return null;

  const hasGamertag = Boolean(identity.gamertag);
  const hasClub = Boolean(identity.clubName);

  return (
    <p className="flex min-w-0 items-center gap-2 overflow-hidden" title={label}>
      {hasGamertag ? (
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-none">
          <EaLogo
            className="block h-[0.72em] w-auto shrink-0 text-foreground supports-[height:1cap]:h-[1cap]"
            viewBox={EA_WORDMARK_VIEW_BOX}
          />
          <span className="truncate">{identity.gamertag}</span>
        </span>
      ) : null}
      {hasGamertag && hasClub ? (
        <span
          aria-hidden="true"
          className="flex items-center text-sm leading-none text-muted-foreground"
        >
          /
        </span>
      ) : null}
      {hasClub ? (
        <span className="flex min-w-0 items-center gap-1.5 leading-none">
          <ClubCrestAvatar
            className="size-5"
            imageUrl={identity.imageUrl}
            name={identity.clubName ?? emptyLabel}
          />
          <span className="typo-caption truncate font-medium leading-none text-muted-foreground">
            {identity.clubName}
          </span>
        </span>
      ) : null}
      {!hasGamertag && !hasClub ? (
        <span className="typo-caption truncate text-muted-foreground">{emptyLabel}</span>
      ) : null}
    </p>
  );
}
