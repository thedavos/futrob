import type { ReactNode } from "react";
import { notFound, useRouter } from "@tanstack/react-router";
import type { PortalRead } from "./public-portal-model.ts";
import { PortalError } from "./public-portal-states.tsx";

/** What a section loader hands its component: a 404 already became the portal's not-found page. */
export type SectionRead<T> = Exclude<PortalRead<T>, { readonly status: "not_found" }>;

/**
 * A section read that answers 404 means the competition stopped being public between reads, so
 * the whole portal answers not found instead of showing an empty section.
 */
export function sectionRead<T>(read: PortalRead<T>): SectionRead<T> {
  if (read.status === "not_found") throw notFound();
  return read;
}

/** Renders a section's data, or a retryable error that reruns the route loaders. */
export function PortalSectionRead<T>({
  children,
  read,
}: {
  readonly children: (data: T) => ReactNode;
  readonly read: SectionRead<T>;
}) {
  const router = useRouter();
  if (read.status === "error") return <PortalError onRetry={() => void router.invalidate()} />;
  return children(read.data);
}
