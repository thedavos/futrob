import type { ReactNode } from "react";
import { Card, CardContent, Skeleton } from "@futrob/ui";

export const STAT_TRIPLE_GRID_CLASS_NAME =
  "grid w-full grid-cols-3 gap-3 [&>[data-slot=stat]]:min-w-0";

export function SummaryCard({
  children,
  footer,
  headingId,
  title,
}: {
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly headingId: string;
  readonly title: string;
}) {
  return (
    <Card aria-labelledby={headingId} className="h-full min-w-0">
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <h2 className="typo-label" id={headingId}>
          {title}
        </h2>
        <div className="h-full flex flex-col justify-center gap-4">
          <div>{children}</div>
          {footer}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCardLoading() {
  return (
    <Card className="h-full min-w-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-16" />
      </CardContent>
    </Card>
  );
}
