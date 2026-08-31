import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PlayerProfileAttributes } from "./player-profile-attributes.tsx";
import { PlayerProfileEvolutionChart } from "./player-profile-evolution-chart.tsx";
import { PlayerProfileFormChart } from "./player-profile-form-chart.tsx";

const styles = stylex.create({
  charts: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 1.9fr) minmax(0, 1fr)",
    },
  },
});

export function PlayerProfileCharts({
  dateFormat,
  numberFormat,
  percentFormat,
  profile,
  t,
}: {
  readonly dateFormat: Intl.DateTimeFormat;
  readonly numberFormat: Intl.NumberFormat;
  readonly percentFormat: Intl.NumberFormat;
  readonly profile: PlayerGameProfileDto;
  readonly t: Translator;
}) {
  return (
    <>
      <div {...applyStyles(styles.charts)}>
        <PlayerProfileEvolutionChart
          dateFormat={dateFormat}
          numberFormat={numberFormat}
          profile={profile}
          t={t}
        />
        <PlayerProfileFormChart percentFormat={percentFormat} profile={profile} t={t} />
      </div>
      <PlayerProfileAttributes
        numberFormat={numberFormat}
        percentFormat={percentFormat}
        profile={profile}
        t={t}
      />
    </>
  );
}
