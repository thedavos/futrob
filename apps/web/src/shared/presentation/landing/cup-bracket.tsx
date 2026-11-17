"use client";

import { useState, type KeyboardEvent } from "react";
import {
  applyStyles,
  elevation,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  typography,
} from "@futrob/ui";
import { TrophyIcon } from "@phosphor-icons/react";

import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  BRACKET_SIZE,
  bracketCrests,
  bracketJunctions,
  bracketLinks,
  COMPACT_BRACKET,
  CUP_CHAMPION,
  CUP_CLUBS,
  CUP_RUNNER_UP,
  FULL_BRACKET,
  routePath,
  routeTouches,
  showsClub,
  type BracketLayout,
  type CupClub,
} from "@/shared/presentation/landing/cup-bracket.model.ts";
import {
  CHAMPION_JUNCTION_DELAY,
  delay,
  RING_DELAY,
  styles,
} from "@/shared/presentation/landing/cup-bracket.styles.ts";

interface ActiveCrest {
  readonly layoutId: BracketLayout["id"];
  readonly club: number;
}

/** Static drawing of one layout; only the hovered route changes between renders. */
function planOf(layout: BracketLayout) {
  return {
    layout,
    crests: bracketCrests(layout),
    links: bracketLinks(layout),
    junctions: bracketJunctions(layout),
    championRoute: routePath(layout, CUP_CHAMPION),
  };
}

type BracketPlan = ReturnType<typeof planOf>;

// Both layouts are rendered; a media query shows the one that fits the viewport.
const LAYOUTS = [
  { plan: planOf(FULL_BRACKET), lines: styles.fullOnly, item: styles.clubFull },
  { plan: planOf(COMPACT_BRACKET), lines: styles.compactOnly, item: styles.clubCompact },
] as const;

function BracketLines({
  activeClub,
  plan,
}: {
  readonly activeClub: CupClub | null;
  readonly plan: BracketPlan;
}) {
  const { layout, links, junctions, championRoute } = plan;
  // The champion's route is always drawn in lime; hovering it adds nothing.
  const routeClub = activeClub === CUP_CHAMPION ? null : activeClub;
  const activeRoute = routeClub === null ? null : routePath(layout, routeClub);
  return (
    <>
      {links.map((link) => (
        <path
          d={link.path}
          key={link.key}
          pathLength={1}
          {...applyStyles(styles.link, RING_DELAY[link.depth])}
        />
      ))}
      <circle
        cx={BRACKET_SIZE / 2}
        cy={BRACKET_SIZE / 2}
        r={layout.trophyRadius}
        {...applyStyles(styles.disc, delay.ring3)}
      />
      {championRoute === null ? null : (
        <path
          d={championRoute}
          pathLength={1}
          {...applyStyles(styles.route, styles.routeChampion, delay.champion)}
        />
      )}
      {activeRoute === null ? null : (
        // Keyed by club so the path redraws when the pointer moves to another crest.
        <path
          d={activeRoute}
          key={routeClub?.index}
          pathLength={1}
          {...applyStyles(styles.route, styles.routeActive)}
        />
      )}
      {junctions.map((junction) => {
        const onActiveRoute =
          routeClub !== null && activeRoute !== null && routeTouches(routeClub, junction);
        return (
          <circle
            cx={junction.x}
            cy={junction.y}
            key={junction.key}
            r={onActiveRoute ? 6 : 4}
            {...applyStyles(
              styles.junction,
              RING_DELAY[junction.depth - 1],
              onActiveRoute && styles.junctionActive,
            )}
          />
        );
      })}
      {junctions
        .filter((junction) => routeTouches(CUP_CHAMPION, junction))
        .map((junction) => (
          // Lime twin of the junction: lights up as the champion's route runs through it.
          <circle
            cx={junction.x}
            cy={junction.y}
            key={junction.key}
            r={6}
            {...applyStyles(
              styles.junction,
              styles.junctionChampion,
              CHAMPION_JUNCTION_DELAY[junction.depth - 1],
            )}
          />
        ))}
    </>
  );
}

/** Radial bracket of a demo cup: the champion's route to the trophy and the official final. */
export function CupBracket() {
  const { t } = useI18n();
  const [active, setActive] = useState<ActiveCrest | null>(null);
  // Roving tabindex: the ring is one tab stop and the arrow keys move around it.
  const [rovingClub, setRovingClub] = useState(CUP_CHAMPION.index);

  const activeClub = active === null ? null : (CUP_CLUBS[active.club] ?? null);
  const finalScore = CUP_CHAMPION.lastScore;

  const describe = (club: CupClub) => {
    const outcome =
      club === CUP_CHAMPION
        ? t("landing.cup.won", { score: club.lastScore })
        : t("landing.cup.lost", { score: club.lastScore });
    return `${t(`landing.cup.stage.${club.stage}`)} · ${outcome}`;
  };

  const moveFocus = (event: KeyboardEvent<HTMLUListElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) {
      return;
    }
    const buttons = [...event.currentTarget.querySelectorAll("button")].filter(
      (button) => button.offsetParent !== null,
    );
    const current = buttons.findIndex((button) => button === document.activeElement);
    if (current === -1) {
      return;
    }
    event.preventDefault();
    buttons[(current + step + buttons.length) % buttons.length]?.focus();
  };

  return (
    <figure aria-label={t("landing.cup.label")} {...applyStyles(styles.figure)}>
      <div {...applyStyles(styles.board)}>
        {LAYOUTS.map(({ plan, lines }) => (
          <svg
            aria-hidden="true"
            key={plan.layout.id}
            viewBox={`0 0 ${BRACKET_SIZE} ${BRACKET_SIZE}`}
            {...applyStyles(styles.lines, lines)}
          >
            <BracketLines activeClub={activeClub} plan={plan} />
          </svg>
        ))}
        <span aria-hidden="true" {...applyStyles(styles.halo, delay.gold)} />
        <span aria-hidden="true" {...applyStyles(styles.trophy, delay.ring3)}>
          <TrophyIcon weight="fill" {...applyStyles(styles.trophyIcon, delay.gold)} />
        </span>
        <TooltipProvider delay={0}>
          <ul onKeyDown={moveFocus} role="list" {...applyStyles(styles.clubs)}>
            {LAYOUTS.map(({ plan: { layout, crests }, item }) => {
              const tabStop = showsClub(layout, CUP_CLUBS[rovingClub] ?? CUP_CHAMPION)
                ? rovingClub
                : CUP_CHAMPION.index;
              return crests.map(({ club, left, top }) => {
                const isActive = active?.layoutId === layout.id && active.club === club.index;
                const isChampion = club === CUP_CHAMPION;
                const summary = describe(club);
                const button = applyStyles(styles.crestButton);
                return (
                  <li
                    key={`${layout.id}-${club.index}`}
                    {...applyStyles(styles.club, item, delay.crests, styles.at(left, top))}
                  >
                    <Tooltip
                      onOpenChange={(open) => {
                        setActive((current) => {
                          if (open) {
                            return { layoutId: layout.id, club: club.index };
                          }
                          const isCurrent =
                            current?.layoutId === layout.id && current.club === club.index;
                          return isCurrent ? null : current;
                        });
                      }}
                      open={isActive}
                    >
                      <TooltipTrigger
                        closeOnClick={false}
                        render={
                          <button
                            aria-label={`${club.name} · ${summary}`}
                            className={button.className}
                            onClick={() => setActive({ layoutId: layout.id, club: club.index })}
                            onFocus={() => setRovingClub(club.index)}
                            style={button.style}
                            tabIndex={club.index === tabStop ? 0 : -1}
                            type="button"
                          />
                        }
                      >
                        <ClubCrestAvatar
                          className={[
                            styles.crest,
                            isActive && styles.crestActive,
                            isChampion && styles.crestChampion,
                          ]}
                          fallbackClassName={styles.initials}
                          imageUrl={null}
                          name={club.name}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span {...applyStyles(styles.tooltipName)}>{club.name}</span>
                        {` · ${summary}`}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              });
            })}
          </ul>
        </TooltipProvider>
      </div>
      <figcaption {...applyStyles(styles.card, elevation.md, delay.card)}>
        <ClubCrestAvatar className={styles.cardCrest} imageUrl={null} name={CUP_CHAMPION.name} />
        <span {...applyStyles(styles.cardText)}>
          <span {...applyStyles(typography.body, styles.cardResult)}>
            {`${CUP_CHAMPION.name} ${finalScore} ${CUP_RUNNER_UP.name}`}
          </span>
          <span {...applyStyles(typography.caption, styles.cardMeta)}>
            {`${t("landing.cup.final")} · ${t("landing.cup.competition")} · `}
            <span {...applyStyles(styles.official)}>{t("landing.cup.official")}</span>
          </span>
        </span>
        <span aria-hidden="true" {...applyStyles(typography.label, styles.stamp, delay.card)}>
          {t("landing.cup.official")}
        </span>
      </figcaption>
    </figure>
  );
}
