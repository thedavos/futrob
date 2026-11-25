"use client";

import type { ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Caption,
  Card,
  CardContent,
  CardHeader,
  Heading,
  Text,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";

const styles = stylex.create({
  card: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
  },
  header: {
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
    gap: "0.75rem",
    paddingTop: 0,
    paddingInline: "1.25rem",
    paddingBottom: "1.25rem",
  },
  flushContent: {
    paddingTop: 0,
    paddingInline: 0,
    paddingBottom: 0,
  },
  chevron: {
    width: "1rem",
    height: "1rem",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.25rem",
    color: colors.mutedForeground,
  },
  emptyWithIcon: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    color: colors.mutedForeground,
  },
  emptyCopy: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.125rem",
  },
});

export function OverviewCard({
  action,
  children,
  flush = false,
  titleId,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly flush?: boolean;
  readonly titleId: string;
  readonly title: string;
}) {
  return (
    <Card aria-labelledby={titleId} className={styles.card}>
      <CardHeader className={styles.header}>
        <Heading className={typography.title} id={titleId}>
          {title}
        </Heading>
        {action}
      </CardHeader>
      <CardContent className={flush ? styles.flushContent : styles.content}>{children}</CardContent>
    </Card>
  );
}

/** Inline empty state for a block inside a card, so no full empty panel is nested in it. */
export function OverviewEmpty({
  action,
  description,
  icon,
  title,
}: {
  readonly action?: ReactNode;
  readonly description: string;
  readonly icon?: ReactNode;
  readonly title: string;
}) {
  if (icon) {
    return (
      <div {...applyStyles(styles.emptyWithIcon)}>
        {icon}
        <div {...applyStyles(styles.emptyCopy)}>
          <Text tone="default" weight="semibold">
            {title}
          </Text>
          <Caption as="p">{description}</Caption>
          {action}
        </div>
      </div>
    );
  }
  return (
    <div {...applyStyles(styles.empty)}>
      <Text tone="default" weight="semibold">
        {title}
      </Text>
      <Caption as="p">{description}</Caption>
      {action}
    </div>
  );
}

export function ViewAllChevron() {
  return <CaretRightIcon aria-hidden {...applyStyles(styles.chevron)} />;
}
