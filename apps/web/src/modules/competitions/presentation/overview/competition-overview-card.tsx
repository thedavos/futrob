"use client";

import type { ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Caption, Card, CardContent, CardHeader, Heading, Text } from "@futrob/ui";
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
});

export function OverviewCard({
  action,
  children,
  titleId,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly titleId: string;
  readonly title: string;
}) {
  return (
    <Card aria-labelledby={titleId} className={styles.card}>
      <CardHeader className={styles.header}>
        <Heading id={titleId}>{title}</Heading>
        {action}
      </CardHeader>
      <CardContent className={styles.content}>{children}</CardContent>
    </Card>
  );
}

/** Inline empty state for a block inside a card, so no full empty panel is nested in it. */
export function OverviewEmpty({
  action,
  description,
  title,
}: {
  readonly action?: ReactNode;
  readonly description: string;
  readonly title: string;
}) {
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
