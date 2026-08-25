import type { ReactNode } from "react";
import { z } from "zod";

const plainTextSchema = z.union([z.string(), z.number()]);

/** Native `title` so truncated text stays reachable. Honors an explicit `title`. */
export function titleWhenTruncated(
  truncate: boolean,
  children: ReactNode,
  title?: string,
): string | undefined {
  if (title !== undefined) {
    return title;
  }
  if (!truncate) {
    return undefined;
  }
  const parsed = plainTextSchema.safeParse(children);
  if (!parsed.success) {
    return undefined;
  }
  return `${parsed.data}`;
}
