"use client";

import { useId } from "react";
import type { CompetitionExploreListingDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, Switch, Text } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OverviewCard } from "./competition-overview-card.tsx";

const styles = stylex.create({
  row: {
    display: "flex",
    minHeight: "2.75rem",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    cursor: "pointer",
  },
  error: {
    color: colors.danger,
  },
});

/** What the organizer sees and changes about the competition's place in Explore. */
export interface ExploreListingControl {
  readonly value: CompetitionExploreListingDto;
  readonly saving: boolean;
  readonly failed: boolean;
  readonly onChange: (next: CompetitionExploreListingDto) => void;
}

export function CompetitionExploreListingCard({
  control,
}: {
  readonly control: ExploreListingControl;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const switchId = useId();
  const descriptionId = useId();
  const listed = control.value === "listed";
  return (
    <OverviewCard title={t("competition.overview.exploreListing.title")} titleId={titleId}>
      <label htmlFor={switchId} {...applyStyles(styles.row)}>
        <Text look="label" tone="default">
          {t("competition.overview.exploreListing.label")}
        </Text>
        <Switch
          aria-describedby={descriptionId}
          checked={listed}
          disabled={control.saving}
          id={switchId}
          onCheckedChange={(checked) => control.onChange(checked ? "listed" : "unlisted")}
        />
      </label>
      <Caption aria-live="polite" as="p" id={descriptionId}>
        {control.saving
          ? t("competition.overview.exploreListing.saving")
          : t(
              listed
                ? "competition.overview.exploreListing.listed"
                : "competition.overview.exploreListing.unlisted",
            )}
      </Caption>
      {control.failed ? (
        <Caption as="p" role="alert" {...applyStyles(styles.error)}>
          {t("competition.overview.exploreListing.error")}
        </Caption>
      ) : null}
    </OverviewCard>
  );
}
