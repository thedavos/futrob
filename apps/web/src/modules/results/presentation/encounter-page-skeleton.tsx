"use client";

import type { ReactElement } from "react";
import * as stylex from "@stylexjs/stylex";
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

const skeleton = stylex.create({
  crumb: { width: "11rem", maxWidth: "100%", height: "1rem" },
  crest: { borderRadius: "var(--corner-full)" },
  teamName: { width: "7rem", maxWidth: "100%", height: "1.125rem" },
  sideLabel: { width: "3.25rem", height: "0.75rem" },
  vs: { width: "1.75rem", height: "1rem", alignSelf: "center" },
  badge: { width: "11rem", maxWidth: "100%", height: "1.5rem", borderRadius: "var(--corner-full)" },
  kickoff: { width: "8.5rem", height: "1rem" },
  zone: { width: "10.5rem", maxWidth: "100%", height: "0.75rem" },
  slotTitle: { width: "5.5rem", height: "1.125rem" },
  slotTime: { width: "7rem", height: "0.75rem" },
  slotStatus: { width: "10.5rem", maxWidth: "100%", height: "0.75rem" },
  previewCopy: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  previewSummary: { width: "16rem", maxWidth: "100%", height: "0.875rem" },
  previewNote: { width: "19rem", maxWidth: "100%", height: "0.875rem" },
  refresh: {
    width: "11.5rem",
    maxWidth: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-md)",
    flexShrink: 0,
  },
  candidateTime: { width: "6.5rem", height: "0.75rem" },
  candidateStatus: { width: "5.5rem", height: "0.75rem" },
  scoreHome: { width: "7rem", maxWidth: "100%", height: "1.125rem", marginInlineStart: "auto" },
  scorePill: { width: "3.25rem", height: "2rem", borderRadius: "var(--corner-lg)" },
  scoreAway: { width: "7rem", maxWidth: "100%", height: "1.125rem" },
  metaChip: { width: "6rem", height: "0.75rem" },
  action: { width: "8.25rem", height: "var(--control-height)", borderRadius: "var(--corner-md)" },
});

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
                <Skeleton aria-hidden="true" {...applyStyles(skeleton.crumb)} />
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
      <div {...applyStyles(styles.workspace)}>
        <EncounterSlotsSkeleton t={t} />
        <EncounterCandidatesSkeleton t={t} />
      </div>
    </main>
  );
}

export function EncounterCandidateRowsSkeleton() {
  return (
    <div aria-hidden="true" {...applyStyles(styles.list)}>
      {CANDIDATE_ROWS.map((index) => (
        <div key={index} {...applyStyles(styles.row, index === 0 && styles.rowFirst)}>
          <div {...applyStyles(styles.rowTop)}>
            <Skeleton {...applyStyles(skeleton.candidateTime)} />
            <Skeleton {...applyStyles(skeleton.candidateStatus)} />
          </div>
          <div {...applyStyles(styles.scoreLine)}>
            <Skeleton {...applyStyles(skeleton.scoreHome)} />
            <Skeleton {...applyStyles(skeleton.scorePill)} />
            <Skeleton {...applyStyles(skeleton.scoreAway)} />
          </div>
          <div {...applyStyles(styles.inline)}>
            <Skeleton {...applyStyles(skeleton.metaChip)} />
            <Skeleton {...applyStyles(skeleton.metaChip)} />
          </div>
          <div {...applyStyles(styles.actions)}>
            <Skeleton {...applyStyles(skeleton.action)} />
            <Skeleton {...applyStyles(skeleton.action)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EncounterHeroSkeleton() {
  return (
    <Card className={styles.hero}>
      <MatchPitchSurface away={EMPTY_CREST} home={EMPTY_CREST}>
        <div aria-hidden="true" {...applyStyles(styles.heroWash)} />
        <div aria-hidden="true" {...applyStyles(styles.heroBody)}>
          <div {...applyStyles(styles.heroTop)}>
            <Skeleton {...applyStyles(skeleton.badge)} />
            <Skeleton {...applyStyles(skeleton.badge)} />
          </div>
          <div {...applyStyles(styles.matchup)}>
            <TeamIdentitySkeleton />
            <Skeleton {...applyStyles(skeleton.vs)} />
            <TeamIdentitySkeleton />
          </div>
          <div {...applyStyles(styles.heroMeta)}>
            <Skeleton {...applyStyles(skeleton.kickoff)} />
            <Skeleton {...applyStyles(skeleton.zone)} />
          </div>
        </div>
      </MatchPitchSurface>
    </Card>
  );
}

function TeamIdentitySkeleton() {
  return (
    <div {...applyStyles(styles.team)}>
      <Skeleton {...applyStyles(styles.crest, skeleton.crest)} />
      <Skeleton {...applyStyles(skeleton.teamName)} />
      <Skeleton {...applyStyles(skeleton.sideLabel)} />
    </div>
  );
}

function EncounterSlotsSkeleton({ t }: { readonly t: Translator }) {
  return (
    <Card aria-labelledby="encounter-slots" className={styles.panelCard}>
      <div {...applyStyles(styles.sectionCopy)}>
        <SectionTitle id="encounter-slots">{t("encounter.slots.title")}</SectionTitle>
        <Caption>{t("encounter.slots.description")}</Caption>
      </div>
      <div aria-hidden="true" {...applyStyles(styles.list)}>
        {SLOT_ROWS.map((slot, index) => (
          <div key={slot} {...applyStyles(styles.row, index === 0 && styles.rowFirst)}>
            <div {...applyStyles(styles.rowTop)}>
              <div {...applyStyles(styles.slotHeading)}>
                <Skeleton {...applyStyles(skeleton.slotTitle)} />
                <Skeleton {...applyStyles(skeleton.slotTime)} />
              </div>
            </div>
            <Skeleton {...applyStyles(skeleton.slotStatus)} />
          </div>
        ))}
      </div>
      <div {...applyStyles(styles.preview)}>
        <Heading as="h3">{t("encounter.preview.title")}</Heading>
        <div aria-hidden="true" {...applyStyles(skeleton.previewCopy)}>
          <Skeleton {...applyStyles(skeleton.previewSummary)} />
          <Skeleton {...applyStyles(skeleton.previewNote)} />
        </div>
      </div>
    </Card>
  );
}

function EncounterCandidatesSkeleton({ t }: { readonly t: Translator }) {
  return (
    <Card aria-labelledby="encounter-candidates" className={styles.panelCard}>
      <div {...applyStyles(styles.sectionHead)}>
        <div {...applyStyles(styles.sectionCopy)}>
          <SectionTitle id="encounter-candidates">{t("encounter.candidates.title")}</SectionTitle>
          <Caption>{t("encounter.candidates.description")}</Caption>
        </div>
        <Skeleton aria-hidden="true" {...applyStyles(skeleton.refresh)} />
      </div>
      <EncounterCandidateRowsSkeleton />
    </Card>
  );
}
