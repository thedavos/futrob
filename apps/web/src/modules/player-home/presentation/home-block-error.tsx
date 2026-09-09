import * as stylex from "@stylexjs/stylex";
import { applyStyles, Button, Caption } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { HomeCard } from "./home-card.tsx";
import { formatUpdatedAgo } from "./player-home-copy.ts";
import type { PlayerHomeSlotStatus } from "./use-player-home.ts";

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
  },
});

export function HomeBlockError({ onRetry }: { readonly onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <HomeCard>
      <div {...applyStyles(styles.stack)}>
        <Caption>{t("player.home.error")}</Caption>
        <Button onClick={onRetry} type="button" variant="outline">
          {t("player.home.cta.retry")}
        </Button>
      </div>
    </HomeCard>
  );
}

export function HomeUpdatedCaption({
  retry,
  updatedAt,
}: {
  readonly retry: () => void;
  readonly updatedAt: Date;
}) {
  const { locale, t } = useI18n();
  return (
    <div {...applyStyles(styles.row)}>
      <Caption>
        {t("player.home.updatedAgo", { time: formatUpdatedAgo(updatedAt, locale) })}
      </Caption>
      <Button dense onClick={retry} type="button" variant="link">
        {t("player.home.cta.retry")}
      </Button>
    </div>
  );
}

export function homeSlotChrome(status: PlayerHomeSlotStatus) {
  if (status.kind === "refreshing") {
    return <HomeUpdatedCaption retry={status.retry} updatedAt={status.updatedAt} />;
  }
  return null;
}
