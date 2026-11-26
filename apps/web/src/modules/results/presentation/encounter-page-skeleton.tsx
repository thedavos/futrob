"use client";

import type { ReactNode } from "react";
import { applyStyles, Caption, Card, Heading, SectionTitle, Skeleton, vis } from "@futrob/ui";
import { InfoIcon } from "@phosphor-icons/react";
import { MatchPitchSurface } from "@/shared/presentation/match-pitch-surface.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { styles } from "./encounter-page.styles.ts";

const EMPTY_CREST = { imageUrl: null, name: "" } as const;
const SLOT_ROWS = [1, 2] as const;
const CANDIDATE_ROWS = [0, 1, 2] as const;

/**
 * Full-page loading layout for encounter detail. Mirrors the data-state blocks
 * that every actor sees (hero, official slots, candidates) so the page does not
 * jump when the first read resolves. Permission-gated panels stay off until
 * the encounter is known.
 */
export function EncounterPageSkeleton({
  breadcrumb,
  t,
}: {
  readonly breadcrumb: ReactNode;
  readonly t: Translator;
}) {
  const label = t("encounter.loading");
  return (
    <main aria-busy="true" aria-label={label} {...applyStyles(styles.main)}>
      <h1 {...applyStyles(vis.srOnly)}>{label}</h1>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <header {...applyStyles(styles.header)}>
        {breadcrumb}
        <EncounterHeroSkeleton />
      </header>
      <EncounterSlotsSkeleton t={t} />
      <EncounterCandidatesSkeleton t={t} />
    </main>
  );
}

export function EncounterCandidateRowsSkeleton() {
  return (
    <div aria-hidden="true" {...applyStyles(styles.list)}>
      {CANDIDATE_ROWS.map((index) => (
        <div key={index} {...applyStyles(styles.row)}>
          <div {...applyStyles(styles.rowTop)}>
            <Skeleton {...applyStyles(styles.skeletonCandidateTime)} />
            <Skeleton {...applyStyles(styles.skeletonCandidateStatus)} />
          </div>
          <div {...applyStyles(styles.scoreLine)}>
            <Skeleton {...applyStyles(styles.skeletonScoreHome)} />
            <Skeleton {...applyStyles(styles.skeletonScorePill)} />
            <Skeleton {...applyStyles(styles.skeletonScoreAway)} />
          </div>
          <div {...applyStyles(styles.inline)}>
            <Skeleton {...applyStyles(styles.skeletonMetaChip)} />
            <Skeleton {...applyStyles(styles.skeletonMetaChip)} />
          </div>
          <div {...applyStyles(styles.actions)}>
            <Skeleton {...applyStyles(styles.skeletonAction)} />
            <Skeleton {...applyStyles(styles.skeletonAction)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EncounterHeroSkeleton() {
  return (
    <Card {...applyStyles(styles.hero)}>
      <MatchPitchSurface away={EMPTY_CREST} home={EMPTY_CREST}>
        <div aria-hidden="true" {...applyStyles(styles.heroBody)}>
          <div {...applyStyles(styles.matchup, styles.scrim)}>
            <TeamIdentitySkeleton />
            <Skeleton {...applyStyles(styles.skeletonVs)} />
            <TeamIdentitySkeleton />
          </div>
          <div {...applyStyles(styles.heroMeta, styles.scrim)}>
            <Skeleton {...applyStyles(styles.skeletonBadge)} />
            <Skeleton {...applyStyles(styles.skeletonKickoff)} />
            <Skeleton {...applyStyles(styles.skeletonZone)} />
          </div>
        </div>
      </MatchPitchSurface>
    </Card>
  );
}

function TeamIdentitySkeleton() {
  return (
    <div {...applyStyles(styles.team)}>
      <Skeleton {...applyStyles(styles.crest, styles.skeletonCrest)} />
      <Skeleton {...applyStyles(styles.skeletonTeamName)} />
      <Skeleton {...applyStyles(styles.skeletonSideLabel)} />
    </div>
  );
}

function EncounterSlotsSkeleton({ t }: { readonly t: Translator }) {
  return (
    <section aria-labelledby="encounter-slots" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionCopy)}>
        <SectionTitle id="encounter-slots">{t("encounter.slots.title")}</SectionTitle>
        <Caption>{t("encounter.slots.description")}</Caption>
      </div>
      <ol {...applyStyles(styles.list)}>
        {SLOT_ROWS.map((slot) => (
          <li key={slot} {...applyStyles(styles.row)}>
            <div {...applyStyles(styles.rowTop)}>
              <div {...applyStyles(styles.slotHeading)}>
                <Heading as="h3">{t("encounter.slot.label", { slot })}</Heading>
                <Skeleton {...applyStyles(styles.skeletonSlotTime)} />
              </div>
            </div>
            <Caption>{t("encounter.slot.unassigned")}</Caption>
          </li>
        ))}
      </ol>
      <div {...applyStyles(styles.preview)}>
        <Heading as="h3">{t("encounter.preview.title")}</Heading>
        <Caption>{t("encounter.preview.incomplete")}</Caption>
        <Caption className={styles.status}>
          <InfoIcon aria-hidden="true" />
          {t("encounter.preview.note")}
        </Caption>
      </div>
    </section>
  );
}

function EncounterCandidatesSkeleton({ t }: { readonly t: Translator }) {
  return (
    <section aria-labelledby="encounter-candidates" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.sectionHead)}>
        <div {...applyStyles(styles.sectionCopy)}>
          <SectionTitle id="encounter-candidates">{t("encounter.candidates.title")}</SectionTitle>
          <Caption>{t("encounter.candidates.description")}</Caption>
        </div>
        <Skeleton aria-hidden="true" {...applyStyles(styles.skeletonRefresh)} />
      </div>
      <EncounterCandidateRowsSkeleton />
    </section>
  );
}
