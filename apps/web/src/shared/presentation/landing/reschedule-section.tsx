"use client";

import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Badge,
  Body,
  Caption,
  Display,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  Subtitle,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const HOME = "Sporting Lomas";
const AWAY = "CD Estrella";

const styles = stylex.create({
  section: {
    backgroundColor: colors.sidebar,
  },
  inner: {
    marginInline: "auto",
    display: "grid",
    maxWidth: "80rem",
    scrollMarginTop: "2rem",
    alignItems: "center",
    gap: {
      default: "3rem",
      [media.lg]: "4rem",
    },
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.lg]: "minmax(0, 6fr) minmax(0, 5fr)",
    },
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "2rem",
    },
    paddingBlock: {
      default: "5rem",
      [media.lg]: "6rem",
    },
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    order: {
      default: 0,
      [media.lg]: 1,
    },
  },
  subtitle: {
    maxWidth: "44ch",
    color: colors.mutedForeground,
    fontSize: {
      default: null,
      [media.sm]: "var(--text-base)",
    },
    lineHeight: {
      default: null,
      [media.sm]: "1.5rem",
    },
  },
  guarantee: {
    maxWidth: "44ch",
  },
  panel: {
    minWidth: 0,
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  panelHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
    padding: "1.25rem",
  },
  encounter: {
    display: "flex",
    minWidth: 0,
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.625rem",
    fontWeight: 600,
  },
  crest: {
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  versus: {
    color: colors.mutedForeground,
    fontWeight: 400,
  },
  panelBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: "1.25rem",
  },
  times: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  time: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  timeValue: {
    fontSize: "var(--text-lg)",
    lineHeight: "1.75rem",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  },
  timeCurrent: {
    color: colors.mutedForeground,
  },
  timeProposed: {
    color: colors.foreground,
  },
});

export function RescheduleSection() {
  const { t } = useI18n();
  const crest = applyStyles(styles.crest);
  return (
    <section id="reprogramacion" {...applyStyles(styles.section)}>
      <div {...applyStyles(styles.inner)}>
        <div {...applyStyles(styles.copy)}>
          <Display as="h2">{t("landing.reschedule.title")}</Display>
          <Subtitle {...applyStyles(styles.subtitle)}>{t("landing.reschedule.subtitle")}</Subtitle>
          <Body {...applyStyles(styles.guarantee)}>{t("landing.reschedule.guarantee")}</Body>
        </div>
        <figure aria-label={t("landing.reschedule.panel.label")} {...applyStyles(styles.panel)}>
          <div {...applyStyles(styles.panelHeader)}>
            <span {...applyStyles(styles.encounter)}>
              <ClubCrestAvatar
                className={crest.className}
                imageUrl={null}
                name={HOME}
                style={crest.style}
              />
              {HOME}
              <span {...applyStyles(styles.versus)}>vs</span>
              {AWAY}
              <ClubCrestAvatar
                className={crest.className}
                imageUrl={null}
                name={AWAY}
                style={crest.style}
              />
            </span>
            <Badge variant="warning">{t("landing.reschedule.panel.status")}</Badge>
          </div>
          <div {...applyStyles(styles.panelBody)}>
            <div {...applyStyles(styles.times)}>
              <div {...applyStyles(styles.time)}>
                <Caption as="span" tone="muted">
                  {t("landing.reschedule.panel.current")}
                </Caption>
                <span {...applyStyles(styles.timeValue, styles.timeCurrent)}>
                  {t("landing.reschedule.panel.currentValue")}
                </span>
              </div>
              <div {...applyStyles(styles.time)}>
                <Caption as="span" tone="muted">
                  {t("landing.reschedule.panel.proposed")}
                </Caption>
                <span {...applyStyles(styles.timeValue, styles.timeProposed)}>
                  {t("landing.reschedule.panel.proposedValue")}
                </span>
              </div>
            </div>
            <MetaList columns={2}>
              <MetaItem>
                <MetaTerm>{t("landing.reschedule.panel.scope")}</MetaTerm>
                <MetaValue>{t("landing.reschedule.panel.scopeValue")}</MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{t("landing.reschedule.panel.deadline")}</MetaTerm>
                <MetaValue>{t("landing.reschedule.panel.deadlineValue")}</MetaValue>
              </MetaItem>
            </MetaList>
            <Caption as="p" tone="muted">
              {t("landing.reschedule.panel.requestedBy")}
            </Caption>
          </div>
        </figure>
      </div>
    </section>
  );
}
