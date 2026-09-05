"use client";

import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { ProviderMatchDetailModel } from "./provider-match-detail-model.ts";
import { TeamComparisonSection } from "./provider-match-detail-summary-comparison.tsx";
import { MatchHighlightsSection } from "./provider-match-detail-summary-highlights.tsx";
import { YourPerformanceSection } from "./provider-match-detail-summary-performance.tsx";

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    containerType: "inline-size",
  },
  statsGroup: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 64rem)": "repeat(2, minmax(0, 1fr))",
    },
    alignItems: "stretch",
    gap: "1.5rem",
  },
});

export function MatchDetailSummary({
  model,
  numberFormat,
  t,
}: {
  readonly model: ProviderMatchDetailModel;
  readonly numberFormat: Intl.NumberFormat;
  readonly t: Translator;
}) {
  const percentFormat = new Intl.NumberFormat(numberFormat.resolvedOptions().locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  const comparison = (
    <TeamComparisonSection
      comparison={model.comparison}
      numberFormat={numberFormat}
      percentFormat={percentFormat}
      t={t}
    />
  );

  return (
    <div {...applyStyles(styles.stack)}>
      {model.appearance ? (
        <div data-summary-stats="" {...applyStyles(styles.statsGroup)}>
          <YourPerformanceSection
            appearance={model.appearance}
            numberFormat={numberFormat}
            percentFormat={percentFormat}
            t={t}
          />
          {comparison}
        </div>
      ) : (
        comparison
      )}
      <MatchHighlightsSection
        highlights={model.highlights.items}
        numberFormat={numberFormat}
        percentFormat={percentFormat}
        t={t}
      />
    </div>
  );
}
