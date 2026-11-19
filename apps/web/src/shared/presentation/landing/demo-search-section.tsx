"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import type { ExternalClubDto } from "@futrob/api-contracts";
import { applyStyles, Button, Caption, Card, typography } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import { colors, space } from "@futrob/ui/styles/tokens.stylex";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { ClubSearchPanel } from "@/modules/game-data/presentation/club-search-panel.tsx";
import {
  eaPlatformLabel,
  formatProviderGameEdition,
} from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { authClient } from "@/modules/identity/auth-client.ts";
import {
  onboardingHandoffHref,
  type OnboardingHandoff,
} from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LandingSection } from "@/shared/presentation/landing/landing-section.tsx";
import { OpenCompetitionsPanel } from "@/shared/presentation/landing/open-competitions-panel.tsx";

const styles = stylex.create({
  visual: {
    display: "grid",
    gap: space.s6,
  },
  card: {
    display: "grid",
    gap: space.s6,
    padding: {
      default: space.s5,
      [media.sm]: space.s8,
    },
  },
  idle: {
    display: "flex",
    alignItems: "center",
    gap: space.s4,
  },
  idleIcon: {
    display: "grid",
    flexShrink: 0,
    placeItems: "center",
    width: "3rem",
    height: "3rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.accent,
    color: colors.accentForeground,
  },
  identity: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: space.s4,
  },
  crest: {
    width: "4rem",
    height: "4rem",
  },
  crestFallback: {
    fontSize: "1.25rem",
  },
  name: {
    minWidth: 0,
    overflowWrap: "anywhere",
  },
  actions: {
    display: "grid",
    justifyItems: "start",
    gap: space.s4,
  },
  muted: {
    color: colors.mutedForeground,
  },
  // Its label is wider than the card at 360 px; it wraps instead of pushing the page sideways.
  organizer: {
    maxWidth: "100%",
    paddingBlock: space.s2,
    whiteSpace: "normal",
  },
});

/**
 * Landing search of an EA club that ends in signing up with that club already chosen, next to
 * the competitions with open registration it can join.
 */
export function DemoSearchSection() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<ExternalClubDto | null>(null);
  return (
    <LandingSection
      align="start"
      copy={
        <ClubSearchPanel
          onSelect={setSelected}
          selectedExternalClubId={selected?.externalClubId ?? null}
        />
      }
      id="demo"
      subtitle={t("landing.demo.subtitle")}
      title={t("landing.demo.title")}
      tone="band"
    >
      <div {...applyStyles(styles.visual)}>
        {selected ? <SelectedClubCard club={selected} /> : <IdleClubCard />}
        <OpenCompetitionsPanel club={selected} key={selected?.externalClubId ?? "none"} />
      </div>
    </LandingSection>
  );
}

function IdleClubCard() {
  const { t } = useI18n();
  return (
    <Card {...applyStyles(styles.card)}>
      <div {...applyStyles(styles.idle)}>
        <span aria-hidden="true" {...applyStyles(styles.idleIcon)}>
          <MagnifyingGlassIcon size={24} />
        </span>
        <p {...applyStyles(typography.body, styles.muted)}>{t("landing.demo.idle")}</p>
      </div>
      <OrganizerLink />
    </Card>
  );
}

function SelectedClubCard({ club }: { readonly club: ExternalClubDto }) {
  const { t } = useI18n();
  const signedIn = authClient.useSession().data?.user != null;
  const handoff = {
    kind: "club",
    locator: {
      providerKey: club.providerKey,
      externalClubId: club.externalClubId,
      platform: club.platform,
      gameEdition: club.gameEdition,
    },
  } as const satisfies OnboardingHandoff;
  const onboardingHref = onboardingHandoffHref(handoff);
  const crest = applyStyles(styles.crest);
  const crestFallback = applyStyles(styles.crestFallback);
  return (
    <Card aria-live="polite" {...applyStyles(styles.card)}>
      <div {...applyStyles(styles.identity)}>
        <ClubCrestAvatar
          className={crest.className}
          fallbackClassName={crestFallback.className}
          framed={!club.imageUrl}
          imageUrl={club.imageUrl}
          name={club.name}
          style={crest.style}
        />
        <div>
          <p {...applyStyles(typography.title, styles.name)}>{club.name}</p>
          <Caption>
            {eaPlatformLabel(club.platform)} · {formatProviderGameEdition(club.gameEdition)}
          </Caption>
        </div>
      </div>
      <div {...applyStyles(styles.actions)}>
        <Button
          render={
            signedIn ? (
              <a href={onboardingHref} />
            ) : (
              <Link search={{ redirectTo: onboardingHref }} to="/signup" />
            )
          }
        >
          {t("landing.demo.cta")}
        </Button>
        <OrganizerLink />
      </div>
    </Card>
  );
}

/** Secondary path for an organizer; ghost so lime stays on the primary action. */
function OrganizerLink() {
  const { t } = useI18n();
  return (
    <Button className={styles.organizer} render={<Link to="/signup" />} variant="ghost">
      {t("landing.demo.organizer")}
    </Button>
  );
}
