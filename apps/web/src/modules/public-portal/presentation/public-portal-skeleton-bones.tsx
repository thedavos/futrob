import { useId } from "react";
import { Link } from "@tanstack/react-router";
import type { PublicRankingKindDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Caption,
  Heading,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextLink,
  vis,
} from "@futrob/ui";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PORTAL_RANKING_KINDS, type PortalRef, type PortalSection } from "./public-portal-model.ts";
import { styles } from "./public-portal.styles.ts";

const COVER_ROWS = [0, 1, 2] as const;
const CALENDAR_ROUNDS = [0, 1] as const;
const CALENDAR_ROWS = [0, 1, 2] as const;
const TABLE_ROWS = [0, 1, 2, 3, 4, 5] as const;
const TEAM_CARDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const BRACKET_ROUNDS = [0, 1] as const;
const BRACKET_ENCOUNTERS = [0, 1] as const;
const STANDINGS_WIDE_FIGURES = [0, 1, 2, 3, 4] as const;
const RULE_GENERAL = [
  "portal.rules.format",
  "portal.rules.teams",
  "portal.rules.roster",
] as const satisfies readonly ParameterlessMessageKey[];
const RULE_STAGE = [
  "portal.rules.points",
  "portal.rules.matches",
  "portal.rules.resolution",
  "portal.rules.rescheduling",
] as const satisfies readonly ParameterlessMessageKey[];

function Abbr({ full, short }: { readonly full: string; readonly short: string }) {
  return (
    <abbr title={full} {...applyStyles(styles.abbr)}>
      {short}
    </abbr>
  );
}

function EncounterBones({ count }: { readonly count: readonly number[] }) {
  return (
    <ul aria-hidden="true" {...applyStyles(styles.list)}>
      {count.map((index) => (
        <li key={index} {...applyStyles(styles.listItem)}>
          <div {...applyStyles(styles.encounter)}>
            <Skeleton {...applyStyles(styles.whenBone, styles.encounterWhen)} />
            <div {...applyStyles(styles.encounterTeams)}>
              <Skeleton {...applyStyles(styles.teamNameBone)} />
              <Skeleton {...applyStyles(styles.versusBone)} />
              <Skeleton {...applyStyles(styles.teamNameBone)} />
            </div>
            <div {...applyStyles(styles.encounterSide)}>
              <Skeleton {...applyStyles(styles.scoreBone)} />
              <Skeleton {...applyStyles(styles.badgeBone)} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FigureBone({ cell }: { readonly cell: ReturnType<typeof applyStyles> }) {
  return (
    <TableCell align="end" className={cell.className} style={cell.style}>
      <Skeleton {...applyStyles(styles.figureBone)} />
    </TableCell>
  );
}

function MetaBones({ terms }: { readonly terms: readonly ParameterlessMessageKey[] }) {
  const { t } = useI18n();
  return (
    <MetaList columns={2}>
      {terms.map((term) => (
        <MetaItem key={term}>
          <MetaTerm>{t(term)}</MetaTerm>
          <MetaValue>
            <Skeleton {...applyStyles(styles.metaValueBone)} />
          </MetaValue>
        </MetaItem>
      ))}
    </MetaList>
  );
}

function CoverBones({ portalRef }: { readonly portalRef: PortalRef | null }) {
  const { t } = useI18n();
  return (
    <>
      <div {...applyStyles(styles.columns)}>
        <section {...applyStyles(styles.section)}>
          <Heading as="h2">{t("portal.cover.results")}</Heading>
          <EncounterBones count={COVER_ROWS} />
        </section>
        <section {...applyStyles(styles.section)}>
          <Heading as="h2">{t("portal.cover.upcoming")}</Heading>
          <EncounterBones count={COVER_ROWS} />
        </section>
      </div>
      {portalRef ? (
        <p>
          <TextLink
            render={<Link params={portalRef} to="/$organizationSlug/$competitionKey/calendar" />}
          >
            {t("portal.cover.calendarLink")}
          </TextLink>
        </p>
      ) : (
        <Skeleton aria-hidden="true" {...applyStyles(styles.linkBone)} />
      )}
    </>
  );
}

function CalendarBones() {
  return (
    <div {...applyStyles(styles.rounds)}>
      {CALENDAR_ROUNDS.map((round) => (
        <section key={round} {...applyStyles(styles.section)}>
          <Skeleton aria-hidden="true" {...applyStyles(styles.headingBone)} />
          <EncounterBones count={CALENDAR_ROWS} />
        </section>
      ))}
    </div>
  );
}

function StandingsBones() {
  const { t } = useI18n();
  const headingId = useId();
  const cell = applyStyles(styles.tableCellBone);
  const wideCell = applyStyles(styles.tableCellBone, styles.wideOnly);
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t("standings.table.label")}
      </h2>
      <Caption as="p">{t("portal.standings.caption")}</Caption>
      <Table
        containerClassName={styles.tableSkeleton}
        containerLabelledBy={headingId}
        containerTabIndex={-1}
      >
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <Abbr full={t("standings.col.position.full")} short={t("standings.col.position")} />
            </TableHead>
            <TableHead scope="col">{t("standings.col.team")}</TableHead>
            <TableHead align="end" scope="col">
              <Abbr full={t("standings.col.played.full")} short={t("standings.col.played")} />
            </TableHead>
            <TableHead align="end" className={styles.wideOnly} scope="col">
              <Abbr
                full={t("portal.standings.col.wins.full")}
                short={t("portal.standings.col.wins")}
              />
            </TableHead>
            <TableHead align="end" className={styles.wideOnly} scope="col">
              <Abbr
                full={t("portal.standings.col.draws.full")}
                short={t("portal.standings.col.draws")}
              />
            </TableHead>
            <TableHead align="end" className={styles.wideOnly} scope="col">
              <Abbr
                full={t("portal.standings.col.losses.full")}
                short={t("portal.standings.col.losses")}
              />
            </TableHead>
            <TableHead align="end" className={styles.wideOnly} scope="col">
              <Abbr
                full={t("portal.standings.col.goalsFor.full")}
                short={t("portal.standings.col.goalsFor")}
              />
            </TableHead>
            <TableHead align="end" className={styles.wideOnly} scope="col">
              <Abbr
                full={t("portal.standings.col.goalsAgainst.full")}
                short={t("portal.standings.col.goalsAgainst")}
              />
            </TableHead>
            <TableHead align="end" scope="col">
              <Abbr
                full={t("standings.col.goalDifference.full")}
                short={t("standings.col.goalDifference")}
              />
            </TableHead>
            <TableHead align="end" scope="col">
              <Abbr full={t("standings.col.points.full")} short={t("standings.col.points")} />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TABLE_ROWS.map((index) => (
            <TableRow key={index}>
              <TableCell className={cell.className} style={cell.style}>
                <Skeleton {...applyStyles(styles.positionBone)} />
              </TableCell>
              <TableCell className={cell.className} style={cell.style}>
                <Skeleton {...applyStyles(styles.teamNameBone)} />
              </TableCell>
              <FigureBone cell={cell} />
              {STANDINGS_WIDE_FIGURES.map((figure) => (
                <FigureBone cell={wideCell} key={figure} />
              ))}
              <FigureBone cell={cell} />
              <FigureBone cell={cell} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function RankingsBones({ rankingKind }: { readonly rankingKind: PublicRankingKindDto }) {
  const { t } = useI18n();
  const headingId = useId();
  const cell = applyStyles(styles.tableCellBone);
  const wideCell = applyStyles(styles.tableCellBone, styles.wideOnly);
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <h2 id={headingId} {...applyStyles(vis.srOnly)}>
        {t(`competition.rankings.table.${rankingKind}`)}
      </h2>
      <nav aria-label={t("portal.rankings.kinds")}>
        <ul {...applyStyles(styles.kinds)}>
          {PORTAL_RANKING_KINDS.map((kind) => (
            <li key={kind}>
              <span {...applyStyles(styles.kind, kind === rankingKind && styles.kindActive)}>
                {t(`competition.rankings.kind.${kind}`)}
              </span>
            </li>
          ))}
        </ul>
      </nav>
      <Caption as="p">{t(`competition.rankings.criterion.${rankingKind}`)}</Caption>
      <Table
        containerClassName={styles.tableSkeleton}
        containerLabelledBy={headingId}
        containerTabIndex={-1}
      >
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <Abbr full={t("standings.col.position.full")} short={t("standings.col.position")} />
            </TableHead>
            <TableHead scope="col">{t("portal.rankings.col.player")}</TableHead>
            <TableHead className={styles.wideOnly} scope="col">
              {t("portal.rankings.col.team")}
            </TableHead>
            <TableHead align="end" scope="col">
              <Abbr
                full={t("portal.rankings.col.matches.full")}
                short={t("portal.rankings.col.matches")}
              />
            </TableHead>
            <TableHead align="end" scope="col">
              {t(`competition.rankings.metric.${rankingKind}`)}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TABLE_ROWS.map((index) => (
            <TableRow key={index}>
              <TableCell className={cell.className} style={cell.style}>
                <Skeleton {...applyStyles(styles.positionBone)} />
              </TableCell>
              <TableCell className={cell.className} style={cell.style}>
                <Skeleton {...applyStyles(styles.playerBone)} />
              </TableCell>
              <TableCell className={wideCell.className} style={wideCell.style}>
                <Skeleton {...applyStyles(styles.teamNameBone)} />
              </TableCell>
              <FigureBone cell={cell} />
              <FigureBone cell={cell} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function TeamsBones() {
  const { t } = useI18n();
  return (
    <section {...applyStyles(styles.section)}>
      <Heading as="h2">{t("portal.section.teams")}</Heading>
      <ul aria-hidden="true" {...applyStyles(styles.teams)}>
        {TEAM_CARDS.map((index) => (
          <li key={index} {...applyStyles(styles.teamCard)}>
            <Skeleton {...applyStyles(styles.teamCardBone)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BracketBones() {
  return (
    <div {...applyStyles(styles.rounds)}>
      <section {...applyStyles(styles.section)}>
        <Skeleton aria-hidden="true" {...applyStyles(styles.headingBone)} />
        <ol aria-hidden="true" {...applyStyles(styles.bracket)}>
          {BRACKET_ROUNDS.map((round) => (
            <li key={round} {...applyStyles(styles.section)}>
              <Skeleton {...applyStyles(styles.headingBoneSm)} />
              <ul {...applyStyles(styles.list)}>
                {BRACKET_ENCOUNTERS.map((order) => (
                  <li key={order} {...applyStyles(styles.listItem, styles.bracketEncounter)}>
                    <Skeleton {...applyStyles(styles.bracketCaptionBone)} />
                    <div {...applyStyles(styles.bracketSide)}>
                      <Skeleton {...applyStyles(styles.bracketSideBone)} />
                      <Skeleton {...applyStyles(styles.scoreBone)} />
                    </div>
                    <div {...applyStyles(styles.bracketSide)}>
                      <Skeleton {...applyStyles(styles.bracketSideBone)} />
                      <Skeleton {...applyStyles(styles.scoreBone)} />
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function RulesBones() {
  const { t } = useI18n();
  return (
    <div {...applyStyles(styles.rounds)}>
      <section {...applyStyles(styles.section)}>
        <Heading as="h2">{t("portal.section.rules")}</Heading>
        <MetaBones terms={RULE_GENERAL} />
      </section>
      <section {...applyStyles(styles.section)}>
        <Skeleton aria-hidden="true" {...applyStyles(styles.headingBone)} />
        <MetaBones terms={RULE_STAGE} />
      </section>
    </div>
  );
}

export function PortalSectionBones({
  portalRef = null,
  rankingKind = "scorer",
  section,
}: {
  readonly portalRef?: PortalRef | null;
  readonly rankingKind?: PublicRankingKindDto;
  readonly section: PortalSection;
}) {
  switch (section) {
    case "cover":
      return <CoverBones portalRef={portalRef} />;
    case "calendar":
      return <CalendarBones />;
    case "standings":
      return <StandingsBones />;
    case "bracket":
      return <BracketBones />;
    case "teams":
      return <TeamsBones />;
    case "rankings":
      return <RankingsBones rankingKind={rankingKind} />;
    case "rules":
      return <RulesBones />;
    default: {
      const exhaustive: never = section;
      return exhaustive;
    }
  }
}
