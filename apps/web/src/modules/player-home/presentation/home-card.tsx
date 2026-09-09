import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CaretRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Card,
  CardContent,
  CardHeader,
  Display,
  Heading,
  Subtitle,
  TextLink,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    minWidth: 0,
    minHeight: "min-content",
    alignSelf: "stretch",
    flexGrow: 1,
  },
  header: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    padding: "1.25rem",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minHeight: "min-content",
    position: "relative",
    zIndex: 1,
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  contentBare: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    flexGrow: 1,
    flexBasis: "auto",
    minHeight: "min-content",
    position: "relative",
    zIndex: 1,
    padding: "1.5rem",
  },
  contentFlush: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    alignSelf: "stretch",
    width: "100%",
    minHeight: "min-content",
    position: "relative",
    zIndex: 1,
    overflow: "hidden",
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  background: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    zIndex: 0,
  },
  action: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    textDecorationLine: "none",
    fontWeight: "var(--font-weight-medium)",
  },
  chevron: {
    width: "1rem",
    height: "1rem",
  },
  title: {
    fontWeight: 600,
    fontSize: "var(--text-lg)",
  },
});

export type HomeCardLink =
  | "/player/matches"
  | "/player/competitions"
  | "/player/game-accounts"
  | "/player/ea-clubs"
  | "/invitations";

export function HomeCard({
  action,
  backgroundUrl,
  children,
  flush = false,
  title,
}: {
  readonly action?: { readonly label: string; readonly to: HomeCardLink };
  readonly backgroundUrl?: string;
  readonly children: ReactNode;
  readonly flush?: boolean;
  readonly title?: string;
}) {
  const background = applyStyles(styles.background);
  const hasHeader = Boolean(title || action);
  const content = applyStyles(hasHeader ? styles.content : styles.contentBare);
  return (
    <Card className={styles.root}>
      {backgroundUrl ? (
        <img
          alt=""
          aria-hidden="true"
          className={background.className}
          data-outline="none"
          src={backgroundUrl}
          style={background.style}
        />
      ) : null}
      {hasHeader ? (
        <CardHeader className={styles.header}>
          {title ? <Heading className={styles.title}>{title}</Heading> : <span />}
          {action ? (
            <TextLink className={styles.action} render={<Link to={action.to} />} text="caption">
              {action.label}
              <CaretRightIcon aria-hidden {...applyStyles(styles.chevron)} />
            </TextLink>
          ) : null}
        </CardHeader>
      ) : null}
      {flush ? (
        <div {...applyStyles(styles.contentFlush)}>{children}</div>
      ) : (
        <CardContent className={content.className} style={content.style}>
          {children}
        </CardContent>
      )}
    </Card>
  );
}

export function HomeBanner({
  icon,
  look = "banner",
  title,
  subtitle,
}: {
  readonly icon?: ReactNode;
  readonly look?: "banner" | "hero";
  readonly subtitle: string;
  readonly title: string;
}) {
  switch (look) {
    case "hero":
      return (
        <div {...applyStyles(banner.copy)}>
          <Display as="h1" className={banner.heroTitle}>
            {title}
          </Display>
          <Subtitle className={banner.heroSubtitle}>{subtitle}</Subtitle>
        </div>
      );
    case "banner":
      return (
        <div {...applyStyles(banner.stack)}>
          {icon}
          <div {...applyStyles(banner.copy)}>
            <p {...applyStyles(banner.title)}>{title}</p>
            <p {...applyStyles(banner.subtitle)}>{subtitle}</p>
          </div>
        </div>
      );
    default: {
      const _exhaustive: never = look;
      return _exhaustive;
    }
  }
}

const banner = stylex.create({
  stack: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    fontWeight: 600,
    color: colors.foreground,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontWeight: "var(--font-weight-medium)",
  },
  heroTitle: {
    fontSize: 28,
  },
  heroSubtitle: {
    fontWeight: "var(--font-weight-medium)",
  },
});
