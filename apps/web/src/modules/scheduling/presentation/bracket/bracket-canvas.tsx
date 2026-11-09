import { Link } from "@tanstack/react-router";
import { applyStyles, Caption, Heading, Text } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { fixtureRoundLabel, fixtureSideLabel } from "../competition-fixture-labels.ts";
import type { FixtureSide } from "../competition-fixture-view.ts";
import { BRACKET_GEOMETRY, matchesTeam, type BracketNode } from "./bracket-model.ts";
import {
  encounterStatus,
  px,
  type Formatters,
  type Scope,
  type StageProps,
} from "./bracket-page-shared.ts";
import { BRACKET_HEADINGS_HEIGHT, styles } from "./bracket-page.styles.ts";

export function BracketCanvas({ formatters, scope, stage, t, teamId }: StageProps) {
  const { nodeWidth } = BRACKET_GEOMETRY;
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
            {...applyStyles(styles.wire)}
          />
        ))}
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
    </div>
  );
}

function BracketCard({
  formatters,
  node,
  scope,
  t,
  teamId,
}: {
  readonly formatters: Formatters;
  readonly node: BracketNode;
  readonly scope: Scope;
  readonly t: Translator;
  readonly teamId: string | null;
}) {
  const { encounter } = node;
  const dimmed = !matchesTeam(encounter, teamId);
  const home = fixtureSideLabel(encounter.home, t);
  const away = fixtureSideLabel(encounter.away, t);
  const kickoff = formatters.kickoff.format(new Date(encounter.scheduledStartAt));
  const status = encounterStatus(encounter, t);
  const label = t("bracket.node.label", {
    round: fixtureRoundLabel(node.round.name, t),
    number: node.position,
    home,
    away,
    kickoff,
    status,
  });
  return (
    <Link
      aria-label={dimmed ? `${label} ${t("bracket.node.outsideFilter")}` : label}
      params={{
        orgId: scope.organizationId,
        competitionId: scope.competitionId,
        encounterId: encounter.id,
      }}
      to="/orgs/$orgId/competitions/$competitionId/encounters/$encounterId"
      {...applyStyles(styles.card, node.isFinal && styles.cardFinal, dimmed && styles.cardDimmed)}
    >
      <span {...applyStyles(styles.cardMeta)}>
        <Caption as="span">{t("bracket.node.number", { number: node.position })}</Caption>
        <Caption as="span">
          <time dateTime={encounter.scheduledStartAt}>
            {formatters.day.format(new Date(encounter.scheduledStartAt))}
          </time>
        </Caption>
      </span>
      <span {...applyStyles(styles.sides)}>
        <SideName side={encounter.home} label={home} teamId={teamId} />
        <SideName side={encounter.away} label={away} teamId={teamId} />
      </span>
      <Caption as="span" className={styles.status}>
        {encounter.officialMatchCount === 2 ? `${status} · ${t("bracket.twoLegs")}` : status}
      </Caption>
    </Link>
  );
}

function SideName({
  label,
  side,
  teamId,
}: {
  readonly label: string;
  readonly side: FixtureSide;
  readonly teamId: string | null;
}) {
  const known = side.kind === "team" && side.name !== null;
  const followed = side.kind === "team" && side.teamId === teamId;
  return (
    <Text
      as="span"
      className={styles.side}
      tone={known ? "default" : "muted"}
      weight={followed ? "bold" : known ? "semibold" : "medium"}
    >
      {label}
    </Text>
  );
}
