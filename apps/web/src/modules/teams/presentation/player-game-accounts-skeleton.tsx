import * as stylex from "@stylexjs/stylex";
import { applyStyles, Card, CardContent, CardHeader, Separator, Skeleton } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./player-game-accounts-page.styles.ts";

const bones = stylex.create({
  gamepad: {
    width: "4rem",
    height: "4rem",
    flexShrink: 0,
  },
  identifier: {
    width: "8rem",
    height: "1.25rem",
  },
  platformMark: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  platformLabel: {
    width: "6rem",
    height: "1rem",
  },
  edition: {
    width: "3.5rem",
    height: "1rem",
  },
  edit: {
    width: "7.5rem",
    height: "0.75rem",
    justifySelf: "end",
  },
  sectionTitle: {
    width: "11rem",
    height: "1.75rem",
  },
  sectionSubtitle: {
    width: "70%",
    maxWidth: "18rem",
    height: "0.875rem",
  },
  headerAction: {
    width: "8rem",
    height: "2.5rem",
    flexShrink: 0,
    marginLeft: "auto",
  },
  crest: {
    borderRadius: "var(--corner-full)",
  },
  clubName: {
    width: "9rem",
    height: "1rem",
  },
  clubMeta: {
    width: "8rem",
    height: "0.75rem",
  },
  rowAction: {
    width: "5.5rem",
    height: "0.75rem",
  },
  destinations: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    minWidth: 0,
    minHeight: "min-content",
    alignSelf: "stretch",
  },
  lead: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    columnGap: "0.75rem",
    paddingTop: "1.5rem",
    paddingInline: "1.5rem",
    paddingBottom: "1.5rem",
  },
  leadIcon: {
    width: "3.5rem",
    height: "3.5rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  leadCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.5rem",
  },
  leadTitle: {
    width: "8rem",
    height: "1.25rem",
  },
  leadSubtitle: {
    width: "100%",
    maxWidth: "16rem",
    height: "0.875rem",
  },
  leadAction: {
    width: "6.5rem",
    height: "0.75rem",
    marginTop: "0.25rem",
  },
});

export function GameDataPageSkeleton() {
  const { t } = useI18n();
  return (
    <div
      aria-busy="true"
      aria-label={t("player.gameData.loading")}
      role="status"
      {...applyStyles(styles.board)}
    >
      <IdentifierSkeleton />
      <div {...applyStyles(styles.clubsRow)}>
        <ClubsSkeleton />
        <DestinationsSkeleton />
      </div>
    </div>
  );
}

function IdentifierSkeleton() {
  return (
    <Card className={styles.identifierCard}>
      <CardContent className={styles.identifierContent}>
        <div {...applyStyles(styles.identifierBar)}>
          <div {...applyStyles(styles.identifierCluster)}>
            <Skeleton {...applyStyles(bones.gamepad)} />
            <Skeleton {...applyStyles(bones.identifier)} />
          </div>
          <div {...applyStyles(styles.metaColumn)}>
            <Separator orientation="vertical" {...applyStyles(styles.identifierDivider)} />
            <div {...applyStyles(styles.metaCluster)}>
              <Skeleton {...applyStyles(bones.platformMark)} />
              <Skeleton {...applyStyles(bones.platformLabel)} />
            </div>
          </div>
          <div {...applyStyles(styles.metaColumn)}>
            <Separator orientation="vertical" {...applyStyles(styles.identifierDivider)} />
            <Skeleton {...applyStyles(bones.edition)} />
          </div>
          <Skeleton {...applyStyles(bones.edit, styles.editLink)} />
        </div>
      </CardContent>
    </Card>
  );
}

function ClubsSkeleton() {
  return (
    <Card className={styles.large}>
      <CardHeader className={styles.header}>
        <div {...applyStyles(styles.headerCopy)}>
          <Skeleton {...applyStyles(bones.sectionTitle)} />
          <Skeleton {...applyStyles(bones.sectionSubtitle)} />
        </div>
        <Skeleton {...applyStyles(bones.headerAction)} />
      </CardHeader>
      <CardContent className={styles.content}>
        <div {...applyStyles(styles.list)}>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} {...applyStyles(styles.row)}>
              <Skeleton {...applyStyles(styles.crest, bones.crest)} />
              <div {...applyStyles(styles.clubIdentity)}>
                <Skeleton {...applyStyles(bones.clubName)} />
                <Skeleton {...applyStyles(bones.clubMeta)} />
              </div>
              <div {...applyStyles(styles.rowAction)}>
                <Skeleton {...applyStyles(bones.rowAction)} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DestinationsSkeleton() {
  return (
    <div {...applyStyles(bones.destinations)}>
      <LeadSkeleton />
      <LeadSkeleton />
    </div>
  );
}

function LeadSkeleton() {
  return (
    <Card>
      <div {...applyStyles(bones.lead)}>
        <Skeleton {...applyStyles(bones.leadIcon)} />
        <div {...applyStyles(bones.leadCopy)}>
          <Skeleton {...applyStyles(bones.leadTitle)} />
          <Skeleton {...applyStyles(bones.leadSubtitle)} />
          <Skeleton {...applyStyles(bones.leadAction)} />
        </div>
      </div>
    </Card>
  );
}
