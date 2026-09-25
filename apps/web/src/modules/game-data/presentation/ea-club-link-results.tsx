"use client";

import type { ExternalClubDto } from "@futrob/api-contracts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { ClubSearchResultList } from "./club-search-result-item.tsx";

type SelectedClub = {
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
  readonly name: string;
  readonly imageUrl: string | null;
};

type EaClubLinkResultsProps = {
  readonly clubs: readonly ExternalClubDto[] | null;
  readonly selected: SelectedClub | null;
  readonly statusId: string;
  readonly disabled?: boolean;
  readonly onSelectClub: (club: ExternalClubDto) => void;
};

export function EaClubLinkResults({
  clubs,
  selected,
  statusId,
  disabled = false,
  onSelectClub,
}: EaClubLinkResultsProps) {
  const { t } = useI18n();

  if (clubs) {
    return (
      <ClubSearchResultList
        aria-describedby={statusId}
        aria-label={t("onboarding.club.results.aria")}
        clubs={clubs}
        disabled={disabled}
        onSelect={(club) => {
          const match = clubs.find((item) => item.externalClubId === club.externalClubId);
          if (match) onSelectClub(match);
        }}
        selectedExternalClubId={selected?.externalClubId}
      />
    );
  }

  if (!selected) return null;

  return (
    <ClubSearchResultList clubs={[selected]} selectedExternalClubId={selected.externalClubId} />
  );
}
