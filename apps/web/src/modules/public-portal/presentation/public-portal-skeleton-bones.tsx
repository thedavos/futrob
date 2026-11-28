import { Link } from "@tanstack/react-router";
import type { PublicRankingKindDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Card,
  CardContent,
  Heading,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  Skeleton,
  TextLink,
  typography,
} from "@futrob/ui";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { PortalRef, PortalSection } from "./public-portal-model.ts";
import { rulesStyles } from "./public-portal-rules.styles.ts";
import { boneStyles } from "./public-portal-skeleton.styles.ts";
import { RankingsBones, StandingsBones } from "./public-portal-skeleton-tables.tsx";
import { styles } from "./public-portal.styles.ts";

const COVER_ROWS = [0, 1, 2] as const;
const CALENDAR_ROUNDS = [0, 1] as const;
const CALENDAR_ROWS = [0, 1, 2] as const;
const TEAM_CARDS = [0, 1, 2, 3, 4, 5] as const;
const BRACKET_ROUNDS = [0, 1] as const;
const BRACKET_ENCOUNTERS = [0, 1] as const;
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
    <div {...applyStyles(styles.rounds)}>
      <div aria-hidden="true" {...applyStyles(boneStyles.coverTopGrid)}>
        <Skeleton {...applyStyles(boneStyles.coverHeroBone)} />
        <Skeleton {...applyStyles(boneStyles.coverHeroBone)} />
      </div>
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
    </div>
  );
}

function CalendarBones() {
  return (
    <div {...applyStyles(styles.rounds)}>
      <div aria-hidden="true" {...applyStyles(boneStyles.toolbarRow)}>
        <Skeleton {...applyStyles(boneStyles.toolbarPillBone)} />
        <Skeleton {...applyStyles(boneStyles.toolbarFilterBone)} />
      </div>
      {CALENDAR_ROUNDS.map((round) => (
        <section key={round} {...applyStyles(styles.section)}>
          <Skeleton aria-hidden="true" {...applyStyles(styles.headingBone)} />
          <EncounterBones count={CALENDAR_ROWS} />
        </section>
      ))}
    </div>
  );
}

function TeamsBones() {
  const { t } = useI18n();
  return (
    <section {...applyStyles(styles.section)}>
      <Heading as="h2">{t("portal.section.teams")}</Heading>
      <ul aria-hidden="true" {...applyStyles(boneStyles.teamsGrid)}>
        {TEAM_CARDS.map((index) => (
          <li key={index} {...applyStyles(boneStyles.teamTileBone)}>
            <div {...applyStyles(boneStyles.teamTileRow)}>
              <Skeleton {...applyStyles(boneStyles.crestBone)} />
              <Skeleton {...applyStyles(styles.teamCardBone)} />
            </div>
            <Skeleton {...applyStyles(boneStyles.subLineBone)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BracketBones() {
  return (
    <div {...applyStyles(styles.rounds)}>
      <div aria-hidden="true" {...applyStyles(boneStyles.toolbarRow)}>
        <Skeleton {...applyStyles(boneStyles.toolbarPillBone)} />
        <Skeleton {...applyStyles(boneStyles.toolbarFilterBone)} />
      </div>
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
    <div {...applyStyles(rulesStyles.columns)}>
      <Card>
        <CardContent className={rulesStyles.cardBody}>
          <section {...applyStyles(rulesStyles.section)}>
            <Heading as="h2" className={typography.title}>
              {t("portal.rules.competitionTitle")}
            </Heading>
            <MetaBones terms={RULE_GENERAL} />
          </section>
          <section {...applyStyles(rulesStyles.section)}>
            <Skeleton aria-hidden="true" {...applyStyles(styles.headingBone)} />
            <MetaBones terms={RULE_STAGE} />
          </section>
        </CardContent>
      </Card>
      <Card aria-hidden="true">
        <CardContent className={rulesStyles.cardBody}>
          <Skeleton {...applyStyles(styles.headingBone)} />
          <Skeleton {...applyStyles(styles.factsBone)} />
          <Skeleton {...applyStyles(styles.factsBone)} />
        </CardContent>
      </Card>
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
