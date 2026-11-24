"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import {
  applyStyles,
  Caption,
  Progress,
  ProgressIndicator,
  ProgressTrack,
  Skeleton,
  Text,
  vis,
} from "@futrob/ui";
import { GAME_PLATFORM, type GamePlatform } from "@futrob/shared-kernel";
import { authClient } from "@/modules/identity/auth-client.ts";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";

/**
 * One open list shared by the club and competition results of the landing search: each row is
 * the link, with its action as lime text, so ten results do not stack ten identical buttons.
 */
export const landingResultStyles = stylex.create({
  results: {
    display: "grid",
    gap: space.s2,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: space.s1,
    paddingInline: space.s1,
  },
  list: {
    display: "grid",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  // The row's inset keeps the rounded hover fill off the dividers above and below it.
  row: {
    paddingBlock: space.s1,
    borderTopWidth: { default: 1, ":first-child": 0 },
    borderTopStyle: "solid",
    borderTopColor: colors.border,
  },
  // The whole row is the target; hover and focus paint it instead of a button inside it.
  rowLink: {
    display: "flex",
    alignItems: "center",
    gap: space.s3,
    minHeight: "3.5rem",
    paddingBlock: space.s2,
    paddingInline: space.s2,
    borderRadius: "var(--corner-lg)",
    color: "inherit",
    textDecorationLine: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": colors.card,
      ":focus-visible": colors.card,
    },
    outlineColor: colors.ring,
    outlineOffset: {
      default: null,
      ":focus-visible": 2,
    },
    transitionProperty: "background-color",
    transitionDuration: "var(--duration-normal)",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    alignItems: "center",
    gap: space.s3,
  },
  thumb: {
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
  },
  cover: {
    borderRadius: "var(--corner-md)",
    objectFit: "cover",
  },
  copy: {
    display: "grid",
    minWidth: 0,
    gap: "0.125rem",
  },
  name: {
    overflowWrap: "anywhere",
  },
  action: {
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    gap: space.s1,
    color: colors.primary,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  capacity: {
    display: "grid",
    gap: space.s1,
    maxWidth: "14rem",
    marginTop: space.s1,
  },
  titleLine: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: space.s2,
  },
  platform: {
    display: "inline-flex",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.125rem",
    color: colors.mutedForeground,
    fontSize: "0.6875rem",
    fontWeight: 700,
    lineHeight: 1,
  },
  platformLogo: {
    width: "1rem",
    height: "1rem",
  },
  capacityLow: {
    color: colors.warning,
  },
  skeleton: {
    height: "2.5rem",
    flexGrow: 1,
  },
  skeletonRow: {
    display: "flex",
    paddingBlock: space.s3,
    paddingInline: space.s2,
  },
  // Idle, empty and error messages sit centered under the centered search.
  state: {
    display: "grid",
    justifyItems: "center",
    gap: space.s3,
    textAlign: "center",
  },
  id: {
    fontVariantNumeric: "tabular-nums",
  },
  // A quiet message, not an illustration: what was not found and how to widen it.
  empty: {
    display: "grid",
    justifyItems: "center",
    gap: space.s1,
    paddingBlock: space.s6,
    textAlign: "center",
  },
  emptyAction: {
    marginTop: space.s3,
  },
});

/** Three placeholder rows while a search runs. */
export function LandingResultsSkeleton({ label }: { readonly label: string }) {
  return (
    <ul aria-busy="true" aria-label={label} {...applyStyles(landingResultStyles.list)}>
      {[0, 1, 2].map((index) => (
        <li key={index} {...applyStyles(landingResultStyles.row, landingResultStyles.skeletonRow)}>
          <Skeleton {...applyStyles(landingResultStyles.skeleton)} />
        </li>
      ))}
    </ul>
  );
}

/**
 * A search that found nothing: what was not found, how to widen it and, when it can be widened,
 * the action that does it. The title is a paragraph; the section owns the headings.
 */
export function LandingEmptyResult({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  return (
    <div {...applyStyles(landingResultStyles.empty)}>
      <Text look="body" tone="default" weight="semibold">
        {title}
      </Text>
      <Text look="body" tone="muted">
        {description}
      </Text>
      {action ? <div {...applyStyles(landingResultStyles.emptyAction)}>{action}</div> : null}
    </div>
  );
}

/**
 * One result row: the whole row signs up (or, signed in, goes straight to onboarding) with what
 * it names already chosen. `label` names the action for assistive tech; the row's own text
 * would read every fact.
 */
export function LandingResultRow({
  href,
  label,
  action,
  children,
}: {
  /** Onboarding handoff path, reached through signup when signed out. */
  readonly href: string;
  readonly label: string;
  readonly action: string;
  readonly children: ReactNode;
}) {
  const signedIn = authClient.useSession().data?.user != null;
  const link = applyStyles(landingResultStyles.rowLink);
  const content = (
    <>
      <span {...applyStyles(landingResultStyles.identity)}>{children}</span>
      <Caption as="span" {...applyStyles(landingResultStyles.action)}>
        {action}
        <ArrowRightIcon aria-hidden="true" size={14} />
      </Caption>
    </>
  );
  return (
    <li {...applyStyles(landingResultStyles.row)}>
      {signedIn ? (
        <a aria-label={label} href={href} {...link}>
          {content}
        </a>
      ) : (
        <Link aria-label={label} search={{ redirectTo: href }} to="/signup" {...link}>
          {content}
        </Link>
      )}
    </li>
  );
}

/** Teams taken out of the maximum, with a bar; a warning once two places or fewer are left. */
export function LandingCapacity({
  approved,
  max,
  label,
  remainingLabel,
}: {
  readonly approved: number;
  readonly max: number;
  readonly label: string;
  /** Present only when few places are left. */
  readonly remainingLabel: string | null;
}) {
  return (
    <span {...applyStyles(landingResultStyles.capacity)}>
      <Progress aria-hidden value={Math.min(100, (approved / max) * 100)}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <Caption as="span">
        {label}
        {remainingLabel ? (
          <>
            {" · "}
            <span {...applyStyles(landingResultStyles.capacityLow)}>{remainingLabel}</span>
          </>
        ) : null}
      </Caption>
    </span>
  );
}

/**
 * A platform as its logo, named for assistive tech and on hover. Switch 1 and 2 share the logo,
 * so the second carries a «2».
 */
export function LandingPlatformMark({
  platform,
  label,
}: {
  readonly platform: GamePlatform;
  readonly label: string;
}) {
  return (
    <span title={label} {...applyStyles(landingResultStyles.platform)}>
      <PlatformLogo platform={platform} {...applyStyles(landingResultStyles.platformLogo)} />
      {platform === GAME_PLATFORM.NINTENDO_SWITCH_2 ? <span aria-hidden="true">2</span> : null}
      <span {...applyStyles(vis.srOnly)}>{label}</span>
    </span>
  );
}
