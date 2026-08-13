"use client";

import type { Icon } from "@futrob/ui";
import { cn } from "@futrob/ui";
import type { ComponentProps } from "react";

export type QueueTaskTone = "default" | "urgent" | "waiting" | "resolved";

type QueueTaskItemSharedProps = {
  readonly icon: Icon;
  readonly title: string;
  readonly subtitle?: string;
  readonly meta?: string;
  readonly tone?: QueueTaskTone;
  readonly dense?: boolean;
  readonly compact?: boolean;
  readonly active?: boolean;
  readonly className?: string;
};

type QueueTaskItemButtonProps = QueueTaskItemSharedProps &
  Omit<ComponentProps<"button">, "children" | "title" | "className"> & {
    readonly href?: undefined;
  };

type QueueTaskItemLinkProps = QueueTaskItemSharedProps &
  Omit<ComponentProps<"a">, "children" | "title" | "className"> & {
    readonly href: string;
  };

export type QueueTaskItemProps = QueueTaskItemButtonProps | QueueTaskItemLinkProps;

function accessibleName(title: string, subtitle: string | undefined): string {
  return subtitle ? `${title}. ${subtitle}` : title;
}

function triggerClassName(options: {
  readonly active: boolean;
  readonly className: string | undefined;
  readonly compact: boolean;
  readonly dense: boolean;
}): string {
  const { active, className, compact, dense } = options;
  return cn(
    "flex w-full cursor-pointer gap-2.5 rounded-lg text-start text-foreground outline-none transition-[color,background-color] duration-(--duration-fast) ease-(--ease-standard) focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    active ? "bg-muted" : "hover:bg-muted/70",
    dense
      ? "min-h-(--control-height-dense) max-sm:min-h-(--control-height-touch)"
      : "min-h-(--control-height)",
    compact
      ? "items-center justify-center px-0 min-w-(--control-height-dense) max-sm:min-w-(--control-height-touch)"
      : "items-start px-2.5 py-1.5",
    className,
  );
}

function QueueTaskItemContent({
  IconComponent,
  active,
  compact,
  meta,
  subtitle,
  title,
  tone,
}: {
  readonly IconComponent: Icon;
  readonly active: boolean;
  readonly compact: boolean;
  readonly meta: string | undefined;
  readonly subtitle: string | undefined;
  readonly title: string;
  readonly tone: QueueTaskTone;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center",
          compact ? "size-4" : "h-5 w-4",
          tone === "urgent" ? "text-warning" : "text-muted-foreground",
        )}
        data-slot="queue-task-item-icon"
      >
        <IconComponent weight={active ? "fill" : "regular"} />
      </span>
      {compact ? null : (
        <>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className="truncate text-sm font-semibold leading-5 text-foreground"
              title={title}
            >
              {title}
            </span>
            {subtitle ? (
              <span
                className="typo-caption truncate font-medium text-muted-foreground"
                title={subtitle}
              >
                {subtitle}
              </span>
            ) : null}
          </span>
          {meta ? (
            <span
              className={cn(
                "typo-caption shrink-0 font-medium leading-5 tabular-nums",
                tone === "urgent" ? "text-warning" : "text-muted-foreground",
              )}
              data-slot="queue-task-item-meta"
              title={meta}
            >
              {meta}
            </span>
          ) : null}
        </>
      )}
    </>
  );
}

function QueueTaskItemButton({
  active = false,
  className,
  compact = false,
  dense = true,
  icon: IconComponent,
  meta,
  subtitle,
  title,
  tone = "default",
  ...rest
}: QueueTaskItemButtonProps) {
  const name = accessibleName(title, subtitle);

  return (
    <li className="min-w-0" data-slot="queue-task-item">
      <button
        {...rest}
        aria-current={active ? "true" : undefined}
        aria-label={compact ? name : undefined}
        className={triggerClassName({ active, className, compact, dense })}
        data-active={active ? "true" : undefined}
        data-compact={compact ? "true" : undefined}
        data-density={dense ? "dense" : "default"}
        data-slot="queue-task-item-trigger"
        data-tone={tone}
        title={compact ? name : undefined}
        type="button"
      >
        <QueueTaskItemContent
          IconComponent={IconComponent}
          active={active}
          compact={compact}
          meta={meta}
          subtitle={subtitle}
          title={title}
          tone={tone}
        />
      </button>
    </li>
  );
}

function QueueTaskItemLink({
  active = false,
  className,
  compact = false,
  dense = true,
  href,
  icon: IconComponent,
  meta,
  subtitle,
  title,
  tone = "default",
  ...rest
}: QueueTaskItemLinkProps) {
  const name = accessibleName(title, subtitle);

  return (
    <li className="min-w-0" data-slot="queue-task-item">
      <a
        {...rest}
        aria-current={active ? "page" : undefined}
        aria-label={compact ? name : undefined}
        className={triggerClassName({ active, className, compact, dense })}
        data-active={active ? "true" : undefined}
        data-compact={compact ? "true" : undefined}
        data-density={dense ? "dense" : "default"}
        data-slot="queue-task-item-trigger"
        data-tone={tone}
        href={href}
        title={compact ? name : undefined}
      >
        <QueueTaskItemContent
          IconComponent={IconComponent}
          active={active}
          compact={compact}
          meta={meta}
          subtitle={subtitle}
          title={title}
          tone={tone}
        />
      </a>
    </li>
  );
}

export function QueueTaskItem(props: QueueTaskItemProps) {
  if (typeof props.href === "string") {
    return <QueueTaskItemLink {...props} />;
  }
  return <QueueTaskItemButton {...props} />;
}
