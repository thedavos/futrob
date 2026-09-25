import type { CSSProperties, ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps, applyStyles, type HostClassName } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { Card, CardContent } from "../card.tsx";
import { Heading } from "../heading/heading.tsx";
import { Subtitle } from "../subtitle/subtitle.tsx";

export type LeadCardTone = "primary" | "muted";

export type LeadCardProps = {
  readonly action?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: HostClassName;
  readonly icon: ReactNode;
  readonly style?: CSSProperties;
  readonly subtitle?: ReactNode;
  readonly title: ReactNode;
  readonly tone?: LeadCardTone;
};

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    minWidth: 0,
    minHeight: "min-content",
    alignSelf: "stretch",
    flexGrow: 1,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    flexGrow: 1,
    flexBasis: "auto",
    minHeight: "min-content",
    paddingTop: "1.5rem",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    columnGap: "0.75rem",
  },
  iconCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "start",
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
  },
  iconPrimary: {
    backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
    color: colors.primary,
  },
  iconMuted: {
    backgroundColor: "color-mix(in oklab, var(--muted-foreground) 20%, transparent)",
    color: colors.mutedForeground,
  },
  copy: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
  title: {
    fontWeight: 600,
    fontSize: "var(--text-lg)",
  },
  subtitle: {
    fontWeight: "var(--font-weight-medium)",
  },
  action: {
    fontWeight: "var(--font-weight-medium)",
    marginTop: "0.5rem",
  },
});

function LeadCard({
  action,
  children,
  className,
  icon,
  style,
  subtitle,
  title,
  tone = "primary",
}: LeadCardProps) {
  const host = applyProps(className, style, styles.card);
  return (
    <Card className={host.className} data-tone={tone} style={host.style}>
      <CardContent className={styles.body}>
        <div {...applyStyles(styles.row)}>
          <span
            aria-hidden
            {...applyStyles(
              styles.iconCell,
              tone === "muted" ? styles.iconMuted : styles.iconPrimary,
            )}
          >
            {icon}
          </span>
          <div {...applyStyles(styles.copy)}>
            <Heading className={styles.title}>{title}</Heading>
            {subtitle ? <Subtitle className={styles.subtitle}>{subtitle}</Subtitle> : null}
            {children}
            {action ? <div {...applyStyles(styles.action)}>{action}</div> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { LeadCard };
