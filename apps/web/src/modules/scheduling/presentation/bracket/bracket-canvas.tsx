import { Link } from "@tanstack/react-router";
import {
  CalendarBlankIcon,
  CaretRightIcon,
  ClockIcon,
  HourglassIcon,
  MinusCircleIcon,
  SealCheckIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { applyStyles, Caption, Heading, Text, typography, type Icon } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { fixtureRoundLabel, fixtureSideLabel } from "../competition-fixture-labels.ts";
import {
  BRACKET_GEOMETRY,
  matchesTeam,
  type BracketNode,
  type BracketSideKey,
  type BracketWire,
} from "./bracket-model.ts";
import {
  bracketScoreSpoken,
  bracketStatusLabel,
  px,
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
import { BRACKET_HEADINGS_HEIGHT, styles } from "./bracket-page.styles.ts";

const STATUS_ICON = {
  bye: MinusCircleIcon,
  pending: HourglassIcon,
  scheduled: CalendarBlankIcon,
  awaiting_result: ClockIcon,
  official: SealCheckIcon,
} as const satisfies Record<BracketNodeStatus, Icon>;

export function BracketCanvas({
  championName,
  formatters,
  results,
  scope,
  stage,
  t,
  teamId,
}: StageProps & { readonly championName: string | null }) {
  const { nodeWidth, championWidth } = BRACKET_GEOMETRY;
  const nodesById = new Map(stage.nodes.map((node) => [node.encounter.id, node]));
  return (
    <div
      {...applyStyles(
        styles.canvas,
        styles.canvasSize(px(stage.width), px(stage.height + BRACKET_HEADINGS_HEIGHT)),
      )}
    >
      <svg
        aria-hidden="true"
        height={stage.height}
        viewBox={`0 0 ${stage.width} ${stage.height}`}
        width={stage.width}
        {...applyStyles(styles.wires, styles.at("0px", px(BRACKET_HEADINGS_HEIGHT)))}
      >
        {stage.wires.map((wire) => (
          <path
            key={wire.id}
            d={wire.path}
            data-slot="bracket-wire"
            data-state={wire.state}
            {...applyStyles(...wireStyles(wire, nodesById, teamId))}
          />
        ))}
        {stage.champion ? (
          <path
            d={stage.champion.path}
            {...applyStyles(styles.wire, !championName && styles.wirePending)}
          />
        ) : null}
      </svg>
      {stage.columns.map((column, columnIndex) => {
        const headingId = `${stage.id}:column:${columnIndex}`;
        const nodes = stage.nodes.filter((node) => node.columnIndex === columnIndex);
        return (
          <section key={column.round.id} aria-labelledby={headingId}>
            <div
              {...applyStyles(
                styles.columnHeading,
                styles.nodeWidth(px(nodeWidth)),
                styles.at(px(column.x), "0px"),
              )}
            >
              <Heading as="h3" id={headingId}>
                {fixtureRoundLabel(column.round.name, t)}
              </Heading>
              <Caption as="p">
                <time dateTime={column.round.scheduledStartAt}>
                  {formatters.day.format(new Date(column.round.scheduledStartAt))}
                </time>
              </Caption>
            </div>
            <ol {...applyStyles(styles.column)}>
              {nodes.map((node) => (
                <li
                  key={node.encounter.id}
                  {...applyStyles(
                    styles.node,
                    styles.nodeWidth(px(nodeWidth)),
                    styles.at(px(node.x), px(node.y + BRACKET_HEADINGS_HEIGHT)),
                  )}
                >
                  <BracketCard
                    formatters={formatters}
                    node={node}
                    result={results?.get(node.encounter.id)}
                    scope={scope}
                    t={t}
                    teamId={teamId}
                  />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      {stage.champion ? (
        <div
          {...applyStyles(
            styles.champion,
            styles.nodeWidth(px(championWidth)),
            styles.at(px(stage.champion.x), px(stage.champion.y + BRACKET_HEADINGS_HEIGHT)),
          )}
        >
          <TrophyIcon
            aria-hidden="true"
            weight={championName ? "fill" : "regular"}
            {...applyStyles(styles.championIcon, championName !== null && styles.championIconWon)}
          />
          <Caption as="p">{t("bracket.champion.title")}</Caption>
          <Text
            as="p"
            className={styles.championName}
            tone={championName ? "default" : "muted"}
            weight={championName ? "semibold" : "medium"}
          >
            {championName ?? t("bracket.champion.pending")}
          </Text>
        </div>
      ) : null}
    </div>
  );
}

function wireStyles(
  wire: BracketWire,
  nodesById: ReadonlyMap<string, BracketNode>,
  teamId: string | null,
) {
  if (teamId) {
    const source = nodesById.get(wire.sourceId);
    const target = nodesById.get(wire.targetId);
    const followed =
      source !== undefined &&
      target !== undefined &&
      matchesTeam(source.encounter, teamId) &&
      matchesTeam(target.encounter, teamId);
    return [styles.wire, followed ? styles.wireFollowed : styles.wireQuiet];
  }
  return [styles.wire, wire.state === "pending" && styles.wirePending];
}

function BracketCard({
  formatters,
  node,
  result,
  scope,
  t,
  teamId,
}: {
  readonly formatters: Formatters;
  readonly node: BracketNode;
  readonly result: BracketResult | undefined;
  readonly scope: Scope;
  readonly t: Translator;
  readonly teamId: string | null;
}) {
  const { encounter } = node;
  const dimmed = !matchesTeam(encounter, teamId);
  const home = fixtureSideLabel(encounter.home, t);
  const away = fixtureSideLabel(encounter.away, t);
  const kickoff = formatters.kickoff.format(new Date(encounter.scheduledStartAt));
  const status = bracketNodeStatus(encounter, result);
  const statusLabel = bracketStatusLabel(status, t);
  const winner = bracketWinner(node, result);
  const score = result?.score ?? null;
  const homeScore = bracketSideScore(score, "home");
  const awayScore = bracketSideScore(score, "away");
  const spokenScore = bracketScoreSpoken(score, t);
  const spokenStatus = spokenScore ? `${statusLabel}. ${spokenScore}` : statusLabel;
  const label = t("bracket.node.label", {
    round: fixtureRoundLabel(node.round.name, t),
    number: node.position,
    home,
    away,
    kickoff,
    status: spokenStatus,
  });
  const StatusIcon = STATUS_ICON[status];
  return (
    <Link
      aria-label={dimmed ? `${label} ${t("bracket.node.outsideFilter")}` : label}
      params={{
        orgId: scope.organizationId,
        competitionId: scope.competitionId,
        encounterId: encounter.id,
      }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.card, dimmed && styles.cardDimmed)}
    >
      <span {...applyStyles(styles.cardMeta)}>
        <Caption as="span">
          {encounter.officialMatchCount === 2
            ? `${t("bracket.node.number", { number: node.position })} · ${t("bracket.twoLegs")}`
            : t("bracket.node.number", { number: node.position })}
        </Caption>
        <Caption as="span">
          <time dateTime={encounter.scheduledStartAt}>
            {formatters.day.format(new Date(encounter.scheduledStartAt))}
          </time>
        </Caption>
      </span>
      {(["home", "away"] as const).map((side) => (
        <SideRow
          key={side}
          label={side === "home" ? home : away}
          node={node}
          score={side === "home" ? homeScore : awayScore}
          side={side}
          teamId={teamId}
          winner={winner}
        />
      ))}
      <span {...applyStyles(styles.cardFooter)}>
        <span
          {...applyStyles(
            typography.caption,
            styles.status,
            status === "official" && styles.statusOfficial,
            status === "awaiting_result" && styles.statusAwaiting,
          )}
        >
          <StatusIcon aria-hidden="true" {...applyStyles(styles.statusIcon)} />
          {statusLabel}
        </span>
        <CaretRightIcon aria-hidden="true" {...applyStyles(styles.openIcon)} />
      </span>
    </Link>
  );
}

function SideRow({
  label,
  node,
  score,
  side,
  teamId,
  winner,
}: {
  readonly label: string;
  readonly node: BracketNode;
  readonly score: ReturnType<typeof bracketSideScore>;
  readonly side: BracketSideKey;
  readonly teamId: string | null;
  readonly winner: BracketSideKey | null;
}) {
  const slot = node.encounter[side];
  const known = slot.kind === "team" && slot.name !== null;
  const followed = slot.kind === "team" && slot.teamId === teamId;
  const out = winner !== null && winner !== side;
  return (
    <span {...applyStyles(styles.sideRow, followed && styles.sideRowFollowed)}>
      <Text
        as="span"
        tone={out ? "tertiary" : known ? "default" : "muted"}
        truncate
        weight={followed || winner === side ? "bold" : known ? "semibold" : "medium"}
      >
        {label}
      </Text>
      {/* Byes and unplayed Encounters keep the cell empty: no invented score. */}
      <span aria-hidden="true" {...applyStyles(styles.scoreCell, out && styles.scoreOut)}>
        {score?.legs ? <span {...applyStyles(styles.scoreLegs)}>({score.legs})</span> : null}
        {score ? (
          <span {...applyStyles(winner === side && styles.scoreLeader)}>{score.goals}</span>
        ) : null}
      </span>
    </span>
  );
}
