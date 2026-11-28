import {
  CalendarBlankIcon,
  ClockIcon,
  HourglassIcon,
  MinusCircleIcon,
  SealCheckIcon,
  TrophyIcon,
} from "@phosphor-icons/react";
import { applyStyles, Caption, Heading, Text, typography, type Icon } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  PUBLIC_BRACKET_GEOMETRY,
  publicBracketMatchesTeam,
  publicBracketNodeStatus,
  publicBracketSideScore,
  publicBracketWinner,
  type PublicBracketNode,
  type PublicBracketNodeStatus,
  type PublicBracketSideKey,
  type PublicBracketStageLayout,
  type PublicBracketWire,
} from "./public-portal-bracket-model.ts";
import { bracketSideLabel, kickoffLabel } from "./public-portal-model.ts";
import { bracketStyles, PUBLIC_BRACKET_HEADINGS_HEIGHT } from "./public-portal-bracket.styles.ts";

export const BRACKET_STATUS_ICON = {
  bye: MinusCircleIcon,
  pending: HourglassIcon,
  scheduled: CalendarBlankIcon,
  awaiting_result: ClockIcon,
  official: SealCheckIcon,
} as const satisfies Record<PublicBracketNodeStatus, Icon>;

export function publicBracketStatusLabel(status: PublicBracketNodeStatus, t: Translator): string {
  switch (status) {
    case "bye":
      return t("portal.bracket.side.bye");
    case "pending":
      return t("portal.bracket.side.pending");
    case "scheduled":
      return t("portal.encounter.status.scheduled");
    case "awaiting_result":
      return t("portal.encounter.status.awaiting_result");
    case "official":
      return t("portal.encounter.status.official");
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

const px = (value: number) => `${value}px`;

function wireStyles(
  wire: PublicBracketWire,
  nodesById: ReadonlyMap<string, PublicBracketNode>,
  teamName: string | null,
) {
  if (teamName) {
    const source = nodesById.get(wire.sourceId);
    const target = nodesById.get(wire.targetId);
    const followed =
      source !== undefined &&
      target !== undefined &&
      publicBracketMatchesTeam(source.encounter, teamName) &&
      publicBracketMatchesTeam(target.encounter, teamName);
    return [bracketStyles.wire, followed ? bracketStyles.wireFollowed : bracketStyles.wireQuiet];
  }
  return [bracketStyles.wire, wire.state === "pending" && bracketStyles.wirePending];
}

function PublicBracketSideRow({
  node,
  side,
  t,
  teamName,
  winner,
}: {
  readonly node: PublicBracketNode;
  readonly side: PublicBracketSideKey;
  readonly t: Translator;
  readonly teamName: string | null;
  readonly winner: PublicBracketSideKey | null;
}) {
  const slot = node.encounter[side];
  const label = bracketSideLabel(slot, t);
  const score = publicBracketSideScore(node.encounter, side);
  const known = slot.kind === "team";
  const followed = slot.kind === "team" && slot.name === teamName;
  const out = winner !== null && winner !== side;

  return (
    <span {...applyStyles(bracketStyles.sideRow, followed && bracketStyles.sideRowFollowed)}>
      <Text
        as="span"
        tone={out ? "tertiary" : known ? "default" : "muted"}
        truncate
        weight={followed || winner === side ? "bold" : known ? "semibold" : "medium"}
      >
        {label}
      </Text>
      {score ? (
        <span {...applyStyles(bracketStyles.scoreCell, out && bracketStyles.scoreOut)}>
          {score.legs ? (
            <span {...applyStyles(bracketStyles.scoreLegs)}>({score.legs})</span>
          ) : null}
          <span {...applyStyles(winner === side && bracketStyles.scoreLeader)}>{score.goals}</span>
        </span>
      ) : null}
    </span>
  );
}

export function PublicBracketCanvas({
  championName,
  dayFormat,
  locale,
  stage,
  t,
  teamName,
  timeZone,
}: {
  readonly championName: string | null;
  readonly dayFormat: Intl.DateTimeFormat;
  readonly locale: string;
  readonly stage: PublicBracketStageLayout;
  readonly t: Translator;
  readonly teamName: string | null;
  readonly timeZone: string;
}) {
  const { nodeWidth, championWidth } = PUBLIC_BRACKET_GEOMETRY;
  const nodesById = new Map(stage.nodes.map((node) => [node.id, node]));

  return (
    <div
      {...applyStyles(
        bracketStyles.canvas,
        bracketStyles.canvasSize(
          px(stage.width),
          px(stage.height + PUBLIC_BRACKET_HEADINGS_HEIGHT),
        ),
      )}
    >
      <svg
        aria-hidden="true"
        height={stage.height}
        viewBox={`0 0 ${stage.width} ${stage.height}`}
        width={stage.width}
        {...applyStyles(
          bracketStyles.wires,
          bracketStyles.at("0px", px(PUBLIC_BRACKET_HEADINGS_HEIGHT)),
        )}
      >
        {stage.wires.map((wire) => (
          <path
            d={wire.path}
            key={wire.id}
            {...applyStyles(...wireStyles(wire, nodesById, teamName))}
          />
        ))}
        {stage.champion ? (
          <path
            d={stage.champion.path}
            {...applyStyles(
              bracketStyles.wire,
              !championName && bracketStyles.wirePending,
              teamName !== null && championName === teamName && bracketStyles.wireFollowed,
            )}
          />
        ) : null}
      </svg>

      {stage.columns.map((column, columnIndex) => {
        const headingId = `public-bracket-${stage.kind}-${column.round.number}`;
        const nodes = stage.nodes.filter((node) => node.columnIndex === columnIndex);
        return (
          <section aria-labelledby={headingId} key={column.round.number}>
            <div
              {...applyStyles(
                bracketStyles.columnHeading,
                bracketStyles.nodeWidth(px(nodeWidth)),
                bracketStyles.at(px(column.x), "0px"),
              )}
            >
              <Heading as="h3" id={headingId}>
                {t("portal.bracket.round", { round: column.round.number })}
              </Heading>
              <Caption as="p">
                <time dateTime={column.round.scheduledStartAt}>
                  {dayFormat.format(new Date(column.round.scheduledStartAt))}
                </time>
              </Caption>
            </div>
            <ol {...applyStyles(bracketStyles.column)}>
              {nodes.map((node) => {
                const dimmed = !publicBracketMatchesTeam(node.encounter, teamName);
                const status = publicBracketNodeStatus(node.encounter);
                const StatusIcon = BRACKET_STATUS_ICON[status];
                const winner = publicBracketWinner(node);
                return (
                  <li
                    key={node.id}
                    {...applyStyles(
                      bracketStyles.node,
                      bracketStyles.nodeWidth(px(nodeWidth)),
                      bracketStyles.at(px(node.x), px(node.y + PUBLIC_BRACKET_HEADINGS_HEIGHT)),
                    )}
                  >
                    <article
                      {...applyStyles(bracketStyles.card, dimmed && bracketStyles.cardDimmed)}
                    >
                      <span {...applyStyles(bracketStyles.cardMeta)}>
                        <Caption as="span">
                          {node.encounter.officialMatchCount === 2
                            ? `${t("portal.bracket.encounter", { order: node.encounter.order })} · ${t("bracket.twoLegs")}`
                            : t("portal.bracket.encounter", { order: node.encounter.order })}
                        </Caption>
                        <Caption as="span">
                          <time dateTime={node.encounter.scheduledStartAt}>
                            {dayFormat.format(new Date(node.encounter.scheduledStartAt))}
                          </time>
                        </Caption>
                      </span>
                      <PublicBracketSideRow
                        node={node}
                        side="home"
                        t={t}
                        teamName={teamName}
                        winner={winner}
                      />
                      <PublicBracketSideRow
                        node={node}
                        side="away"
                        t={t}
                        teamName={teamName}
                        winner={winner}
                      />
                      <span {...applyStyles(bracketStyles.cardFooter)}>
                        <span
                          {...applyStyles(
                            typography.caption,
                            bracketStyles.status,
                            status === "official" && bracketStyles.statusOfficial,
                            status === "awaiting_result" && bracketStyles.statusAwaiting,
                          )}
                        >
                          <StatusIcon
                            aria-hidden="true"
                            {...applyStyles(bracketStyles.statusIcon)}
                          />
                          {publicBracketStatusLabel(status, t)}
                        </span>
                        <Caption as="span">
                          <time dateTime={node.encounter.scheduledStartAt}>
                            {kickoffLabel(node.encounter.scheduledStartAt, timeZone, locale)}
                          </time>
                        </Caption>
                      </span>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      {stage.champion ? (
        <div
          {...applyStyles(
            bracketStyles.champion,
            championName !== null && bracketStyles.championWon,
            bracketStyles.nodeWidth(px(championWidth)),
            bracketStyles.at(
              px(stage.champion.x),
              px(stage.champion.y + PUBLIC_BRACKET_HEADINGS_HEIGHT),
            ),
          )}
        >
          <TrophyIcon
            aria-hidden="true"
            weight={championName ? "fill" : "regular"}
            {...applyStyles(
              bracketStyles.championIcon,
              championName !== null && bracketStyles.championIconWon,
            )}
          />
          <Caption as="p">{t("bracket.champion.title")}</Caption>
          <Text
            as="p"
            className={bracketStyles.championName}
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
