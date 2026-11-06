"use client";

import { Link } from "@tanstack/react-router";
import { CalendarBlankIcon, ProhibitIcon, UserMinusIcon } from "@phosphor-icons/react";
import { applyStyles, Badge, Caption, Text } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  fixtureByeLabel,
  fixtureSideAccessibleName,
  fixtureSideLabel,
} from "./competition-fixture-labels.ts";
import { styles } from "./competition-fixture-page.styles.ts";
import type {
  FixtureEncounterView,
  FixtureRoundView,
  FixtureSide,
} from "./competition-fixture-view.ts";

type Scope = { readonly organizationId: string; readonly competitionId: string };

/** Waiting for the previous round, not missing data: says when and what it waits for. */
export function UnpairedRound({
  kickoff,
  round,
  t,
}: {
  readonly kickoff: Intl.DateTimeFormat;
  readonly round: FixtureRoundView;
  readonly t: Translator;
}) {
  return (
    <div {...applyStyles(styles.stateRow)}>
      <CalendarBlankIcon aria-hidden size={20} {...applyStyles(styles.stateIcon)} />
      <div {...applyStyles(styles.stateCopy)}>
        <Text weight="medium">{t("fixture.round.pending", { number: round.number - 1 })}</Text>
        <Caption as="p">
          <time dateTime={round.scheduledStartAt}>
            {t("fixture.round.expected", {
              date: kickoff.format(new Date(round.scheduledStartAt)),
            })}
          </time>
        </Caption>
      </div>
    </div>
  );
}

function WithdrawnMark({ side, t }: { readonly side: FixtureSide; readonly t: Translator }) {
  if (side.kind !== "team" || !side.withdrawn) return null;
  return (
    <Badge variant="warning">
      <UserMinusIcon aria-hidden size={12} />
      {t("fixture.side.withdrawn")}
    </Badge>
  );
}

export function ByeRow({
  encounter,
  t,
}: {
  readonly encounter: FixtureEncounterView;
  readonly t: Translator;
}) {
  const resting = encounter.home.kind === "bye" ? encounter.away : encounter.home;
  return (
    <div {...applyStyles(styles.stateRow)}>
      <div {...applyStyles(styles.stateCopy)}>
        <Text weight="semibold">{fixtureByeLabel(encounter.home, encounter.away, t)}</Text>
      </div>
      <WithdrawnMark side={resting} t={t} />
    </div>
  );
}

export function ClosedRow({
  encounter,
  kickoff,
  t,
}: {
  readonly encounter: FixtureEncounterView;
  readonly kickoff: Intl.DateTimeFormat;
  readonly t: Translator;
}) {
  return (
    <div {...applyStyles(styles.row, styles.rowStatic)}>
      <div {...applyStyles(styles.rowMeta)}>
        <Badge variant="neutral">
          <ProhibitIcon aria-hidden size={12} />
          {t("fixture.closed")}
        </Badge>
      </div>
      <Matchup encounter={encounter} t={t} tone="muted" />
      <Text tone="muted">
        <time dateTime={encounter.scheduledStartAt}>
          {kickoff.format(new Date(encounter.scheduledStartAt))}
        </time>
      </Text>
    </div>
  );
}

function Matchup({
  encounter,
  t,
  tone,
}: {
  readonly encounter: FixtureEncounterView;
  readonly t: Translator;
  readonly tone: "default" | "muted";
}) {
  return (
    <div {...applyStyles(styles.matchup)}>
      <div {...applyStyles(styles.sideHome)}>
        <Text align="end" className={styles.side} tone={tone} weight="semibold">
          {fixtureSideLabel(encounter.home, t)}
        </Text>
        <WithdrawnMark side={encounter.home} t={t} />
      </div>
      <Text tone="muted" weight="bold">
        {t("encounter.vs")}
      </Text>
      <div {...applyStyles(styles.sideAway)}>
        <Text align="start" className={styles.side} tone={tone} weight="semibold">
          {fixtureSideLabel(encounter.away, t)}
        </Text>
        <WithdrawnMark side={encounter.away} t={t} />
      </div>
    </div>
  );
}

export function EncounterRow({
  competitionId,
  encounter,
  kickoff,
  organizationId,
  t,
}: Scope & {
  readonly encounter: FixtureEncounterView;
  readonly kickoff: Intl.DateTimeFormat;
  readonly t: Translator;
}) {
  const home = fixtureSideAccessibleName(encounter.home, t);
  const away = fixtureSideAccessibleName(encounter.away, t);
  return (
    <Link
      aria-label={t("fixture.open", { home, away })}
      params={{ orgId: organizationId, competitionId, encounterId: encounter.id }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.row)}
    >
      <div {...applyStyles(styles.rowMeta)}>
        {encounter.group ? (
          <Caption as="span">{t("fixture.group", { group: encounter.group })}</Caption>
        ) : null}
        <Caption as="span">{t("fixture.slots", { count: encounter.officialMatchCount })}</Caption>
      </div>
      <Matchup encounter={encounter} t={t} tone="default" />
      <Text tone="default" weight="medium">
        <time dateTime={encounter.scheduledStartAt}>
          {kickoff.format(new Date(encounter.scheduledStartAt))}
        </time>
      </Text>
    </Link>
  );
}
