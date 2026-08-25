"use client";

import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyProps, applyStyles, typography, type Icon } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
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

const styles = stylex.create({
  item: {
    minWidth: 0,
  },
  trigger: {
    display: "flex",
    width: "100%",
    cursor: "pointer",
    gap: "0.625rem",
    borderRadius: "var(--corner-lg)",
    textAlign: "start",
    color: colors.foreground,
    outlineWidth: 0,
    outlineStyle: "none",
    transitionProperty: "color, background-color",
    transitionDuration: "var(--duration-fast)",
    transitionTimingFunction: "var(--ease-standard)",
    boxShadow: {
      default: null,
      ":focus-visible": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
    pointerEvents: {
      default: null,
      ":disabled": "none",
    },
    opacity: {
      default: 1,
      ":disabled": 0.5,
    },
  },
  triggerIdle: {
    backgroundColor: {
      default: "transparent",
      ":hover": "color-mix(in oklab, var(--muted) 70%, transparent)",
    },
  },
  triggerActive: {
    backgroundColor: colors.muted,
  },
  triggerDense: {
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
  },
  triggerComfortable: {
    minHeight: "var(--control-height)",
  },
  triggerCompact: {
    alignItems: "center",
    justifyContent: "center",
    paddingInline: 0,
    minWidth: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
  },
  triggerExpanded: {
    alignItems: "flex-start",
    paddingInline: "0.625rem",
    paddingBlock: "0.375rem",
  },
  icon: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCompact: {
    width: "1rem",
    height: "1rem",
  },
  iconExpanded: {
    height: "1.25rem",
    width: "1rem",
  },
  iconUrgent: {
    color: colors.warning,
  },
  iconMuted: {
    color: colors.mutedForeground,
  },
  copy: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    gap: "0.25rem",
  },
  title: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    fontWeight: 600,
    color: colors.foreground,
  },
  subtitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontWeight: 500,
    color: colors.mutedForeground,
  },
  meta: {
    flexShrink: 0,
    fontWeight: 500,
    lineHeight: "1.25rem",
    fontVariantNumeric: "tabular-nums",
  },
  metaUrgent: {
    color: colors.warning,
  },
  metaMuted: {
    color: colors.mutedForeground,
  },
});

function accessibleName(title: string, subtitle: string | undefined): string {
  return subtitle ? `${title}. ${subtitle}` : title;
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
        data-slot="queue-task-item-icon"
        {...applyStyles(
          styles.icon,
          compact ? styles.iconCompact : styles.iconExpanded,
          tone === "urgent" ? styles.iconUrgent : styles.iconMuted,
        )}
      >
        <IconComponent weight={active ? "fill" : "regular"} />
      </span>
      {compact ? null : (
        <>
          <span {...applyStyles(styles.copy)}>
            <span title={title} {...applyStyles(styles.title)}>
              {title}
            </span>
            {subtitle ? (
              <span title={subtitle} {...applyStyles(typography.caption, styles.subtitle)}>
                {subtitle}
              </span>
            ) : null}
          </span>
          {meta ? (
            <span
              data-slot="queue-task-item-meta"
              title={meta}
              {...applyStyles(
                typography.caption,
                styles.meta,
                tone === "urgent" ? styles.metaUrgent : styles.metaMuted,
              )}
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
  const trigger = applyProps(
    className,
    undefined,
    styles.trigger,
    active ? styles.triggerActive : styles.triggerIdle,
    dense ? styles.triggerDense : styles.triggerComfortable,
    compact ? styles.triggerCompact : styles.triggerExpanded,
  );

  return (
    <li data-slot="queue-task-item" {...applyStyles(styles.item)}>
      <button
        {...rest}
        aria-current={active ? "true" : undefined}
        aria-label={compact ? name : undefined}
        data-active={active ? "true" : undefined}
        data-compact={compact ? "true" : undefined}
        data-density={dense ? "dense" : "default"}
        data-slot="queue-task-item-trigger"
        data-tone={tone}
        title={compact ? name : undefined}
        type="button"
        {...trigger}
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
  const trigger = applyProps(
    className,
    undefined,
    styles.trigger,
    active ? styles.triggerActive : styles.triggerIdle,
    dense ? styles.triggerDense : styles.triggerComfortable,
    compact ? styles.triggerCompact : styles.triggerExpanded,
  );

  return (
    <li data-slot="queue-task-item" {...applyStyles(styles.item)}>
      <a
        {...rest}
        aria-current={active ? "page" : undefined}
        aria-label={compact ? name : undefined}
        data-active={active ? "true" : undefined}
        data-compact={compact ? "true" : undefined}
        data-density={dense ? "dense" : "default"}
        data-slot="queue-task-item-trigger"
        data-tone={tone}
        href={href}
        title={compact ? name : undefined}
        {...trigger}
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
  if (props.href !== undefined) {
    return <QueueTaskItemLink {...props} />;
  }
  return <QueueTaskItemButton {...props} />;
}
