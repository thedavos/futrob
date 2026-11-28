import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import type {
  GetPublicStandingsResponse,
  GetPublicTeamsResponse,
  PublicStandingRowDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Card,
  CardContent,
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateTitle,
  Field,
  Heading,
  InputWithIcon,
  Text,
  TextLink,
} from "@futrob/ui";
import squadUrl from "@/assets/illustration-squad.png";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { PortalRef } from "./public-portal-model.ts";
import { PortalFormStrip } from "./public-portal-shared.tsx";
import { PortalEmpty } from "./public-portal-states.tsx";
import { teamsStyles } from "./public-portal-teams.styles.ts";

/**
 * Public teams directory (Alternative A): Card flat grid enriched with official standing
 * position, W-D-L record, points, FormStrip, search filter, and quick link to team fixtures.
 */
export function PortalTeamsView({
  portalRef,
  standings = null,
  teams,
}: {
  readonly portalRef?: PortalRef;
  readonly standings?: GetPublicStandingsResponse["standings"] | null;
  readonly teams: GetPublicTeamsResponse["teams"];
}) {
  const { locale, t } = useI18n();
  const headingId = useId();
  const [query, setQuery] = useState("");

  if (teams.length === 0) {
    return (
      <PortalEmpty
        description={t("portal.teams.empty.description")}
        illustration={squadUrl}
        title={t("portal.teams.empty.title")}
      />
    );
  }

  const standingByTeam = new Map<string, PublicStandingRowDto>(
    (standings?.rows ?? []).map((row) => [row.teamName, row]),
  );
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filtered =
    normalizedQuery.length === 0
      ? teams
      : teams.filter((team) => team.name.toLocaleLowerCase(locale).includes(normalizedQuery));
  const crest = applyStyles(teamsStyles.crest);
  const integer = new Intl.NumberFormat(locale);

  return (
    <section aria-labelledby={headingId} {...applyStyles(teamsStyles.section)}>
      <div {...applyStyles(teamsStyles.header)}>
        <Heading as="h2" id={headingId}>
          {t("portal.header.teams", { count: teams.length })}
        </Heading>
        {teams.length > 3 ? (
          <div {...applyStyles(teamsStyles.searchBox)}>
            <Field name="portal-teams-search">
              <InputWithIcon
                aria-label={t("portal.teams.search")}
                dense
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("portal.teams.search")}
                startIcon={MagnifyingGlassIcon}
                type="search"
                value={query}
              />
            </Field>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          <EmptyStateCopy>
            <EmptyStateTitle>{t("portal.teams.filteredEmpty.title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("portal.teams.filteredEmpty.description")}
            </EmptyStateDescription>
          </EmptyStateCopy>
          <EmptyStateActions>
            <Button onClick={() => setQuery("")} type="button" variant="outline">
              {t("portal.teams.clearSearch")}
            </Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <ul {...applyStyles(teamsStyles.grid)}>
          {filtered.map((team) => {
            const standing = standingByTeam.get(team.name) ?? null;
            return (
              <li key={team.name}>
                <Card className={teamsStyles.card}>
                  <CardContent className={teamsStyles.cardBody}>
                    <div {...applyStyles(teamsStyles.cardTop)}>
                      <div {...applyStyles(teamsStyles.identity)}>
                        <ClubCrestAvatar
                          className={crest.className}
                          imageUrl={null}
                          name={team.name}
                          style={crest.style}
                        />
                        <Text className={teamsStyles.teamName} weight="semibold">
                          {team.name}
                        </Text>
                      </div>
                      {standing ? (
                        <Badge variant={standing.position === 1 ? "primary" : "neutral"}>
                          {t("portal.teams.position", { position: standing.position })}
                        </Badge>
                      ) : null}
                    </div>

                    {standing ? (
                      <div {...applyStyles(teamsStyles.statsRow)}>
                        <div {...applyStyles(teamsStyles.recordCopy)}>
                          <Caption as="span">
                            {t("portal.cover.podium.record", {
                              wins: standing.wins,
                              draws: standing.draws,
                              losses: standing.losses,
                            })}
                          </Caption>
                          <Caption as="span">·</Caption>
                          <Caption as="span" className={teamsStyles.pointsStrong}>
                            {t("standings.summary.points", {
                              points: integer.format(standing.points),
                            })}
                          </Caption>
                        </div>
                        <PortalFormStrip compact form={standing.form} slots={3} t={t} />
                      </div>
                    ) : (
                      <Caption as="p">{t("portal.teams.unranked")}</Caption>
                    )}

                    {portalRef ? (
                      <div {...applyStyles(teamsStyles.cardFoot)}>
                        <TextLink
                          className={teamsStyles.calendarLink}
                          render={
                            <Link
                              params={portalRef}
                              search={{ team: team.name }}
                              to="/$organizationSlug/$competitionKey/calendar"
                            />
                          }
                          text="caption"
                        >
                          {t("portal.teams.viewCalendar")}
                          <CaretRightIcon aria-hidden="true" size={14} />
                        </TextLink>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
