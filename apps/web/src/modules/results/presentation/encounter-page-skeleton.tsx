"use client";

import type { ReactElement } from "react";
import {
  applyStyles,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Caption,
  Card,
  Heading,
  SectionTitle,
  Skeleton,
  vis,
} from "@futrob/ui";
import { MatchPitchSurface } from "@/shared/presentation/match-pitch-surface.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { styles } from "./encounter-page.styles.ts";

/** Where the Match Center goes back to, with the list's own name. */
export interface ListLink {
  readonly element: ReactElement;
  readonly label: string;
  readonly back: string;
}

export function EncounterBreadcrumb({
  current,
  link,
  pending = false,
  t,
}: {
  readonly current?: string;
  readonly link: ListLink;
  readonly pending?: boolean;
  readonly t: Translator;
}) {
  return (
    <Breadcrumb aria-label={t("encounter.breadcrumb")}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={link.element}>{link.label}</BreadcrumbLink>
        </BreadcrumbItem>
        {current || pending ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {current ? (
                <BreadcrumbPage>{current}</BreadcrumbPage>
              ) : (
                <Skeleton aria-hidden="true" {...applyStyles(styles.skeletonCrumb)} />
              )}
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

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
  link,
  t,
}: {
  readonly link: ListLink;
  readonly t: Translator;
}) {
  const label = t("encounter.loading");
  return (
    <main aria-busy="true" aria-label={label} {...applyStyles(styles.main)}>
      <h1 {...applyStyles(vis.srOnly)}>{label}</h1>
      <header {...applyStyles(styles.header)}>
        <EncounterBreadcrumb pending link={link} t={t} />
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
      <div aria-hidden="true" {...applyStyles(styles.list)}>
        {SLOT_ROWS.map((slot) => (
          <div key={slot} {...applyStyles(styles.row)}>
            <div {...applyStyles(styles.rowTop)}>
              <div {...applyStyles(styles.slotHeading)}>
                <Skeleton {...applyStyles(styles.skeletonSlotTitle)} />
                <Skeleton {...applyStyles(styles.skeletonSlotTime)} />
              </div>
            </div>
            <Skeleton {...applyStyles(styles.skeletonSlotStatus)} />
          </div>
        ))}
      </div>
      <div {...applyStyles(styles.preview)}>
        <Heading as="h3">{t("encounter.preview.title")}</Heading>
        <div aria-hidden="true" {...applyStyles(styles.skeletonPreviewCopy)}>
          <Skeleton {...applyStyles(styles.skeletonPreviewSummary)} />
          <Skeleton {...applyStyles(styles.skeletonPreviewNote)} />
        </div>
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
