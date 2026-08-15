"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@futrob/ui";
import { DEFAULT_EA_SEARCH_GAME_EDITION } from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import {
  EaClubLinkForm,
  type EaClubLinkSelection,
} from "@/modules/game-data/presentation/ea-club-link-form.tsx";
import { gameDataBrowserClient } from "@/modules/game-data/presentation/game-data-browser-client.ts";
import { useAssociateMyExternalClubMutation } from "@/modules/teams/presentation/player-queries.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export function AddClubDialog({
  open,
  onOpenChange,
  onAssociated,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onAssociated?: () => void;
}) {
  const { t } = useI18n();
  const associate = useAssociateMyExternalClubMutation();
  const [selected, setSelected] = useState<EaClubLinkSelection | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!selected || associate.isPending) return;
    setError(null);
    try {
      await associate.mutateAsync({
        providerKey: selected.providerKey,
        externalClubId: selected.externalClubId,
        platform: selected.platform,
        gameEdition: selected.gameEdition,
        name: selected.name,
        imageUrl: selected.imageUrl,
      });
      onOpenChange(false);
      setSelected(null);
      onAssociated?.();
    } catch {
      setError(t("shell.workspace.addClub.failed"));
    }
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          setSelected(null);
          setError(null);
        }
        onOpenChange(next);
      }}
      open={open}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("shell.workspace.addClub.title")}</DialogTitle>
          <DialogDescription>{t("shell.workspace.addClub.description")}</DialogDescription>
        </DialogHeader>
        <div className="mt-5">
          <EaClubLinkForm
            busy={associate.isPending}
            onClear={() => setSelected(null)}
            onSelect={setSelected}
            searchExternalClubs={async (input) => {
              const result = await gameDataBrowserClient.searchClubs(input);
              if (!result.isOk()) throw result.error;
              return result.value.clubs;
            }}
            searchGameEdition={DEFAULT_EA_SEARCH_GAME_EDITION}
            selected={selected}
          />
        </div>
        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter className="mt-6">
          <Button
            disabled={!selected || associate.isPending}
            onClick={() => void confirm()}
            type="button"
          >
            {t("shell.workspace.addClub.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
