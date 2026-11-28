import { useId, useState } from "react";
import {
  CalendarBlankIcon,
  ClockIcon,
  ListBulletsIcon,
  SealCheckIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react";
import type { CompetitionFormatDto, GetPublicBracketResponse } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Heading,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  vis,
} from "@futrob/ui";
import pendingBracketUrl from "@/assets/illustration-pending-bracket.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PublicBracketCanvas } from "./public-portal-bracket-canvas.tsx";
import { PublicBracketList } from "./public-portal-bracket-list.tsx";
import {
  layoutPublicBracketStage,
  publicBracketChampionName,
  publicBracketMatchesTeam,
  publicBracketStatusCounts,
  publicBracketTeamNames,
} from "./public-portal-bracket-model.ts";
import { hasBracket } from "./public-portal-model.ts";
import { PortalEmpty } from "./public-portal-states.tsx";
import { bracketStyles } from "./public-portal-bracket.styles.ts";

type Bracket = NonNullable<GetPublicBracketResponse["bracket"]>;
type ViewMode = "canvas" | "list";

const ALL_TEAMS = "all";

/**
 * Public bracket (Alternative A): visual SVG draw + accessible list switcher (UX-BRK-001),
 * status summary, team path follower, and Champion card without fake bye scores (UX-BRK-002).
 */
export function PortalBracketView({
  bracket,
  format,
}: {
  readonly bracket: Bracket | null;
  readonly format: CompetitionFormatDto;
}) {
  const { locale, t } = useI18n();
  const teamSelectId = useId();
  const [view, setView] = useState<ViewMode>("canvas");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  if (!hasBracket(format)) {
    return (
      <PortalEmpty
        description={t("bracket.noBracket.description")}
        illustration={pendingBracketUrl}
        title={t("bracket.noBracket.title")}
      />
    );
  }
  if (!bracket || bracket.stages.length === 0) {
    return (
      <PortalEmpty
        description={t("bracket.empty.description")}
        illustration={pendingBracketUrl}
        title={t("bracket.empty.title")}
      />
    );
  }

  const layouts = bracket.stages.map(layoutPublicBracketStage);
  const teamOptions = publicBracketTeamNames(bracket, locale);
  const activeTeam = selectedTeam && teamOptions.includes(selectedTeam) ? selectedTeam : null;
  const counts = publicBracketStatusCounts(layouts);
  const allNodes = layouts.flatMap((stage) => stage.nodes);
  const highlighted = allNodes.filter((node) =>
    publicBracketMatchesTeam(node.encounter, activeTeam),
  ).length;
  const dayFormat = new Intl.DateTimeFormat(locale, {
    timeZone: bracket.timeZone,
    day: "numeric",
    month: "short",
  });
  const allLabel = t("bracket.filter.allTeams");

  return (
    <div {...applyStyles(bracketStyles.stack)}>
      <Tabs
        className={bracketStyles.tabs}
        onValueChange={(value) => {
          if (value === "canvas" || value === "list") setView(value);
        }}
        value={view}
        variant="pills"
      >
        <div {...applyStyles(bracketStyles.toolbar)}>
          <div {...applyStyles(bracketStyles.toolbarStart)}>
            <TabsList aria-label={t("bracket.views.label")}>
              <TabsTrigger value="canvas">
                <TreeStructureIcon aria-hidden="true" />
                {t("bracket.views.canvas")}
              </TabsTrigger>
              <TabsTrigger value="list">
                <ListBulletsIcon aria-hidden="true" />
                {t("bracket.views.list")}
              </TabsTrigger>
            </TabsList>

            <ul aria-label={t("bracket.summary.label")} {...applyStyles(bracketStyles.summary)}>
              {counts.official > 0 ? (
                <li>
                  <Badge variant="approved">
                    <SealCheckIcon aria-hidden="true" />
                    {t("bracket.summary.official", { count: counts.official })}
                  </Badge>
                </li>
              ) : null}
              {counts.awaiting > 0 ? (
                <li>
                  <Badge variant="warning">
                    <ClockIcon aria-hidden="true" />
                    {t("bracket.summary.awaiting", { count: counts.awaiting })}
                  </Badge>
                </li>
              ) : null}
              {counts.upcoming > 0 ? (
                <li>
                  <Badge variant="neutral">
                    <CalendarBlankIcon aria-hidden="true" />
                    {t("bracket.summary.upcoming", { count: counts.upcoming })}
                  </Badge>
                </li>
              ) : null}
            </ul>
          </div>

          {teamOptions.length > 1 ? (
            <div {...applyStyles(bracketStyles.filter)}>
              <label htmlFor={teamSelectId} {...applyStyles(vis.srOnly)}>
                {t("bracket.filter.team")}
              </label>
              <Select
                items={[
                  { label: allLabel, value: ALL_TEAMS },
                  ...teamOptions.map((name) => ({ label: name, value: name })),
                ]}
                onValueChange={(value) =>
                  setSelectedTeam(!value || value === ALL_TEAMS ? null : String(value))
                }
                value={activeTeam ?? ALL_TEAMS}
              >
                <SelectTrigger className={bracketStyles.filterTrigger} dense id={teamSelectId}>
                  {activeTeam ?? allLabel}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TEAMS}>{allLabel}</SelectItem>
                  {teamOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div {...applyStyles(bracketStyles.filterSummary)}>
          <Caption as="p">{t("portal.header.timeZone", { zone: bracket.timeZone })}</Caption>
          {activeTeam ? (
            <>
              <Text aria-live="polite" as="p" look="caption" tone="muted">
                {t("bracket.filter.summary", { shown: highlighted, total: allNodes.length })}
              </Text>
              <Button dense onClick={() => setSelectedTeam(null)} type="button" variant="ghost">
                {t("bracket.filter.clear")}
              </Button>
            </>
          ) : null}
        </div>

        <TabsContent className={bracketStyles.panel} value="canvas">
          {layouts.map((stage) => {
            const stageLabel = t(`portal.bracket.stage.${stage.kind}`);
            const championName = publicBracketChampionName(stage);
            return (
              <section key={stage.kind} {...applyStyles(bracketStyles.stage)}>
                <div {...applyStyles(bracketStyles.stageHeader)}>
                  <Heading as="h2">{stageLabel}</Heading>
                  <ul aria-label={t("bracket.facts")} {...applyStyles(bracketStyles.facts)}>
                    <li>
                      <Badge>
                        {stage.columns.length === 1
                          ? t("bracket.rounds.one")
                          : t("bracket.rounds.other", { count: stage.columns.length })}
                      </Badge>
                    </li>
                    <li>
                      <Badge>
                        {stage.encounterCount === 1
                          ? t("bracket.encounters.one")
                          : t("bracket.encounters.other", { count: stage.encounterCount })}
                      </Badge>
                    </li>
                    {stage.byeCount > 0 ? (
                      <li>
                        <Badge>
                          {stage.byeCount === 1
                            ? t("bracket.byes.one")
                            : t("bracket.byes.other", { count: stage.byeCount })}
                        </Badge>
                      </li>
                    ) : null}
                    {stage.twoLegCount > 0 ? (
                      <li>
                        <Badge>{t("bracket.twoLegs")}</Badge>
                      </li>
                    ) : null}
                  </ul>
                </div>
                <Caption as="p">{t("bracket.hint")}</Caption>
                {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
                <div
                  aria-label={t("bracket.canvasLabel", { stage: stageLabel })}
                  role="region"
                  tabIndex={0}
                  {...applyStyles(bracketStyles.scroller)}
                >
                  <PublicBracketCanvas
                    championName={championName}
                    dayFormat={dayFormat}
                    locale={locale}
                    stage={stage}
                    t={t}
                    teamName={activeTeam}
                    timeZone={bracket.timeZone}
                  />
                </div>
              </section>
            );
          })}
        </TabsContent>

        <TabsContent className={bracketStyles.panel} value="list">
          {layouts.map((stage) => (
            <section key={stage.kind} {...applyStyles(bracketStyles.stage)}>
              <Heading as="h2">{t(`portal.bracket.stage.${stage.kind}`)}</Heading>
              <PublicBracketList
                championName={publicBracketChampionName(stage)}
                locale={locale}
                stage={stage}
                t={t}
                teamName={activeTeam}
                timeZone={bracket.timeZone}
              />
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
