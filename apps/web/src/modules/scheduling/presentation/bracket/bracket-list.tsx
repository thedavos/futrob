import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { applyStyles, Badge, Caption, Heading, Text, vis } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { fixtureRoundLabel, fixtureSideLabel } from "../competition-fixture-labels.ts";
import { matchesTeam, type BracketNode } from "./bracket-model.ts";
import {
  bracketStatusLabel,
  type Formatters,
  type Scope,
  type StageProps,
} from "./bracket-page-shared.ts";
import {
  bracketNodeStatus,
  bracketSideScore,
  bracketWinner,
  type BracketNodeStatus,
  type BracketResult,
} from "./bracket-results.ts";
import { styles } from "./bracket-page.styles.ts";

const STATUS_BADGE = {
  bye: "outline",
  pending: "outline",
  scheduled: "neutral",
  awaiting_result: "warning",
  official: "approved",
} as const satisfies Record<BracketNodeStatus, ComponentProps<typeof Badge>["variant"]>;

/** The accessible alternative to the canvas (UX-BRK-001): the same Encounters, round by round. */
export function BracketList({ formatters, results, scope, stage, t, teamId }: StageProps) {
  return (
    <div {...applyStyles(styles.list)}>
      {stage.columns.map((column, columnIndex) => {
        const headingId = `${stage.id}:list:${columnIndex}`;
        const nodes = stage.nodes.filter(
          (node) => node.columnIndex === columnIndex && matchesTeam(node.encounter, teamId),
        );
        return (
          <section
            key={column.round.id}
            aria-labelledby={headingId}
            {...applyStyles(styles.listRound)}
          >
            <Heading as="h3" id={headingId}>
              {fixtureRoundLabel(column.round.name, t)}
            </Heading>
            {nodes.length === 0 ? (
              <Caption as="p">{t("bracket.list.noneForTeam")}</Caption>
            ) : (
              <ol {...applyStyles(styles.listItems)}>
                {nodes.map((node) => (
                  <li key={node.encounter.id}>
                    <BracketListRow
                      formatters={formatters}
                      node={node}
                      result={results?.get(node.encounter.id)}
                      scope={scope}
                      t={t}
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

function BracketListRow({
  formatters,
  node,
  result,
  scope,
  t,
}: {
  readonly formatters: Formatters;
  readonly node: BracketNode;
  readonly result: BracketResult | undefined;
  readonly scope: Scope;
  readonly t: Translator;
}) {
  const { encounter } = node;
  const home = fixtureSideLabel(encounter.home, t);
  const away = fixtureSideLabel(encounter.away, t);
  const status = bracketNodeStatus(encounter, result);
  const winner = bracketWinner(node, result);
  const homeScore = bracketSideScore(result?.score ?? null, "home");
  const awayScore = bracketSideScore(result?.score ?? null, "away");
  const details = [
    t("bracket.node.number", { number: node.position }),
    formatters.kickoff.format(new Date(encounter.scheduledStartAt)),
    ...(encounter.officialMatchCount === 2 ? [t("bracket.twoLegs")] : []),
  ].join(" · ");
  return (
    <Link
      params={{
        orgId: scope.organizationId,
        competitionId: scope.competitionId,
        encounterId: encounter.id,
      }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.listRow)}
    >
      <span {...applyStyles(styles.listRowSide)}>
        <Text as="span" className={styles.listRowName} weight="semibold">
          {t("bracket.list.matchup", { home, away })}
        </Text>
        {homeScore && awayScore ? (
          <>
            <span aria-hidden="true" {...applyStyles(styles.scoreCell)}>
              <span {...applyStyles(winner === "home" && styles.scoreLeader)}>
                {homeScore.goals}
              </span>
              <span {...applyStyles(styles.scoreLegs)}>–</span>
              <span {...applyStyles(winner === "away" && styles.scoreLeader)}>
                {awayScore.goals}
              </span>
            </span>
            <span {...applyStyles(vis.srOnly)}>
              {t("bracket.score", { home: homeScore.goals, away: awayScore.goals })}
            </span>
          </>
        ) : null}
      </span>
      <span {...applyStyles(styles.listRowMeta)}>
        <Badge variant={STATUS_BADGE[status]}>{bracketStatusLabel(status, t)}</Badge>
        <Caption as="span">{details}</Caption>
      </span>
    </Link>
  );
}
