import { TrophyIcon } from "@phosphor-icons/react";
import { applyStyles, Caption, Heading, Text, typography } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  publicBracketMatchesTeam,
  publicBracketNodeStatus,
  publicBracketSideScore,
  publicBracketWinner,
  type PublicBracketStageLayout,
} from "./public-portal-bracket-model.ts";
import { BRACKET_STATUS_ICON, publicBracketStatusLabel } from "./public-portal-bracket-canvas.tsx";
import { bracketSideLabel, kickoffLabel } from "./public-portal-model.ts";
import { bracketStyles } from "./public-portal-bracket.styles.ts";

export function PublicBracketList({
  championName,
  locale,
  stage,
  t,
  teamName,
  timeZone,
}: {
  readonly championName: string | null;
  readonly locale: string;
  readonly stage: PublicBracketStageLayout;
  readonly t: Translator;
  readonly teamName: string | null;
  readonly timeZone: string;
}) {
  return (
    <div {...applyStyles(bracketStyles.stack)}>
      <div {...applyStyles(bracketStyles.listGrid)}>
        {stage.columns.map((column, columnIndex) => {
          const nodes = stage.nodes.filter((node) => node.columnIndex === columnIndex);
          return (
            <section key={column.round.number} {...applyStyles(bracketStyles.listRound)}>
              <Heading as="h3">{t("portal.bracket.round", { round: column.round.number })}</Heading>
              <ul {...applyStyles(bracketStyles.listItems)}>
                {nodes.map((node) => {
                  const dimmed = !publicBracketMatchesTeam(node.encounter, teamName);
                  const status = publicBracketNodeStatus(node.encounter);
                  const StatusIcon = BRACKET_STATUS_ICON[status];
                  const winner = publicBracketWinner(node);
                  const homeScore = publicBracketSideScore(node.encounter, "home");
                  const awayScore = publicBracketSideScore(node.encounter, "away");
                  return (
                    <li
                      key={node.id}
                      {...applyStyles(bracketStyles.listRow, dimmed && bracketStyles.listRowDimmed)}
                    >
                      <div {...applyStyles(bracketStyles.listRowMeta)}>
                        <Caption as="span">
                          {t("portal.bracket.encounter", { order: node.encounter.order })} ·{" "}
                          <time dateTime={node.encounter.scheduledStartAt}>
                            {kickoffLabel(node.encounter.scheduledStartAt, timeZone, locale)}
                          </time>
                        </Caption>
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
                      </div>
                      <p {...applyStyles(bracketStyles.listRowSide)}>
                        <Text
                          tone={
                            winner === "away"
                              ? "tertiary"
                              : node.encounter.home.kind === "team"
                                ? "default"
                                : "muted"
                          }
                          weight={winner === "home" ? "bold" : "semibold"}
                        >
                          {bracketSideLabel(node.encounter.home, t)}
                        </Text>
                        {homeScore ? (
                          <span
                            {...applyStyles(
                              bracketStyles.scoreCell,
                              winner === "away" && bracketStyles.scoreOut,
                            )}
                          >
                            <span {...applyStyles(winner === "home" && bracketStyles.scoreLeader)}>
                              {homeScore.goals}
                            </span>
                          </span>
                        ) : null}
                      </p>
                      <p {...applyStyles(bracketStyles.listRowSide)}>
                        <Text
                          tone={
                            winner === "home"
                              ? "tertiary"
                              : node.encounter.away.kind === "team"
                                ? "default"
                                : "muted"
                          }
                          weight={winner === "away" ? "bold" : "semibold"}
                        >
                          {bracketSideLabel(node.encounter.away, t)}
                        </Text>
                        {awayScore ? (
                          <span
                            {...applyStyles(
                              bracketStyles.scoreCell,
                              winner === "home" && bracketStyles.scoreOut,
                            )}
                          >
                            <span {...applyStyles(winner === "away" && bracketStyles.scoreLeader)}>
                              {awayScore.goals}
                            </span>
                          </span>
                        ) : null}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {stage.champion ? (
        <div
          {...applyStyles(
            bracketStyles.listChampion,
            championName !== null && bracketStyles.championWon,
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
          <div>
            <Caption as="p">{t("bracket.champion.title")}</Caption>
            <Text tone={championName ? "default" : "muted"} weight="semibold">
              {championName ?? t("bracket.champion.pending")}
            </Text>
          </div>
        </div>
      ) : null}
    </div>
  );
}
