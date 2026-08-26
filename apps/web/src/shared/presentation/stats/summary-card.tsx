import type { ComponentProps, CSSProperties, ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyProps,
  applyStyles,
  Card,
  CardContent,
  Skeleton,
  typography,
  type HostClassName,
} from "@futrob/ui";

const styles = stylex.create({
  card: {
    height: "100%",
    minWidth: 0,
  },
  content: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    gap: "0.5rem",
    paddingInline: "1rem",
    paddingTop: "1rem",
    paddingBottom: "1rem",
  },
  body: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "1rem",
  },
  loadingContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    paddingInline: "1rem",
    paddingTop: "1rem",
    paddingBottom: "1rem",
  },
  skeletonTitle: {
    height: "1rem",
    width: "6rem",
  },
  skeletonValue: {
    height: "2.5rem",
    width: "4rem",
  },
});

export function SummaryCard({
  children,
  className,
  footer,
  headingId,
  style,
  title,
  ...props
}: {
  readonly children: ReactNode;
  readonly className?: HostClassName;
  readonly footer?: ReactNode;
  readonly headingId: string;
  readonly style?: CSSProperties;
  readonly title: string;
} & Omit<ComponentProps<typeof Card>, "children" | "className" | "style">) {
  const card = applyProps(className, style, styles.card);
  return (
    <Card aria-labelledby={headingId} className={card.className} style={card.style} {...props}>
      <CardContent className={styles.content}>
        <h2 id={headingId} {...applyStyles(typography.label)}>
          {title}
        </h2>
        <div {...applyStyles(styles.body)}>
          <div>{children}</div>
          {footer}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCardLoading({
  className,
  style,
  ...props
}: {
  readonly className?: HostClassName;
  readonly style?: CSSProperties;
} & Omit<ComponentProps<typeof Card>, "children" | "className" | "style">) {
  const card = applyProps(className, style, styles.card);
  const title = applyStyles(styles.skeletonTitle);
  const value = applyStyles(styles.skeletonValue);
  return (
    <Card className={card.className} style={card.style} {...props}>
      <CardContent className={styles.loadingContent}>
        <Skeleton className={title.className} style={title.style} />
        <Skeleton className={value.className} style={value.style} />
      </CardContent>
    </Card>
  );
}
