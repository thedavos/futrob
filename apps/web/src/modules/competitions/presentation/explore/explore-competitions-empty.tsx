import { useId } from "react";
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@futrob/ui";
import trophyUrl from "@/assets/trophy.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export function ExploreCompetitionsEmpty({
  filtered,
  onClear,
}: {
  readonly filtered: boolean;
  readonly onClear: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <EmptyState aria-labelledby={titleId} fill>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={trophyUrl} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle id={titleId}>
          {filtered
            ? t("player.competitions.explore.empty.filtered.title")
            : t("player.competitions.explore.empty.none.title")}
        </EmptyStateTitle>
        <EmptyStateDescription>
          {filtered
            ? t("player.competitions.explore.empty.filtered.subtitle")
            : t("player.competitions.explore.empty.none.subtitle")}
        </EmptyStateDescription>
      </EmptyStateCopy>
      {filtered ? (
        <EmptyStateActions>
          <Button onClick={onClear} variant="outline">
            {t("player.competitions.explore.empty.filtered.cta")}
          </Button>
        </EmptyStateActions>
      ) : null}
    </EmptyState>
  );
}
