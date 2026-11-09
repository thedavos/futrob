import { Link } from "@tanstack/react-router";
import { CaretDownIcon } from "@phosphor-icons/react";
import {
  applyStyles,
  Caption,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Heading,
  Text,
} from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { fixtureRoundLabel, fixtureSideLabel } from "../competition-fixture-labels.ts";
import { matchesTeam, type BracketNode } from "./bracket-model.ts";
import {
  encounterStatus,
  type Formatters,
  type Scope,
  type StageProps,
} from "./bracket-page-shared.ts";
import { styles } from "./bracket-page.styles.ts";

export function BracketList({ formatters, scope, stage, t, teamId }: StageProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger>
        <Text as="span" weight="semibold">
          {t("bracket.list.toggle")}
        </Text>
        <CaretDownIcon aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent>
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
                        <BracketListRow formatters={formatters} node={node} scope={scope} t={t} />
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function BracketListRow({
  formatters,
  node,
  scope,
  t,
}: {
  readonly formatters: Formatters;
  readonly node: BracketNode;
  readonly scope: Scope;
  readonly t: Translator;
}) {
  const { encounter } = node;
  const home = fixtureSideLabel(encounter.home, t);
  const away = fixtureSideLabel(encounter.away, t);
  const status = encounterStatus(encounter, t);
  const details = [
    t("bracket.node.number", { number: node.position }),
    formatters.kickoff.format(new Date(encounter.scheduledStartAt)),
    status,
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
      <Text as="span" weight="semibold">
        {t("bracket.list.matchup", { home, away })}
      </Text>
      <Caption as="span">{details}</Caption>
    </Link>
  );
}
