"use client";

import type { ComponentType, SVGProps } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  DropdownMenuLabel,
  DropdownMenuItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@futrob/ui";
import { colors, media } from "@futrob/ui/styles/public.stylex";
import { BuildingsIcon, PlusIcon, TrophyIcon } from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";
import {
  type WorkspaceDisplayRole,
  type WorkspaceSelectorClubOption,
} from "./workspace-selector-model.ts";
import { WORKSPACE_ROLE_ICONS, workspaceRoleMessageKey } from "./workspace-role-icons.ts";

const styles = stylex.create({
  header: {
    display: "flex",
    alignItems: "center",
  },
  headerLabel: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    paddingBlock: "0.375rem",
    paddingInlineEnd: "0.25rem",
  },
  headerAction: {
    width: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    height: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    minHeight: {
      default: "var(--control-height-dense)",
      [media.maxSm]: "var(--control-height-touch)",
    },
    flexShrink: 0,
    justifyContent: "center",
    padding: 0,
    color: colors.mutedForeground,
  },
  tooltipTrigger: {
    display: "inline-flex",
  },
  icon: {
    width: "1rem",
    height: "1rem",
  },
  iconMuted: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  itemBetween: {
    justifyContent: "space-between",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  roleTrigger: {
    marginLeft: "auto",
    display: "inline-flex",
    flexShrink: 0,
    color: colors.mutedForeground,
  },
});

export function SectionHeaderAction({
  title,
  actionLabel,
  onAction,
}: {
  readonly title: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
}) {
  const label = applyStyles(styles.headerLabel);
  const action = applyStyles(styles.headerAction);
  const trigger = applyStyles(styles.tooltipTrigger);
  const icon = applyStyles(styles.icon);
  return (
    <div {...applyStyles(styles.header)}>
      <DropdownMenuLabel className={label.className} style={label.style}>
        {title}
      </DropdownMenuLabel>
      <DropdownMenuItem
        aria-label={actionLabel}
        className={action.className}
        onClick={onAction}
        style={action.style}
      >
        <Tooltip>
          <TooltipTrigger
            render={<span className={trigger.className} style={trigger.style} tabIndex={-1} />}
          >
            <PlusIcon aria-hidden="true" className={icon.className} style={icon.style} />
          </TooltipTrigger>
          <TooltipContent>{actionLabel}</TooltipContent>
        </Tooltip>
      </DropdownMenuItem>
    </div>
  );
}

export function RoleAwareMenuItem({
  name,
  role,
  EntityIcon,
  onSelect,
}: {
  readonly name: string;
  readonly role: WorkspaceDisplayRole;
  readonly EntityIcon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  readonly onSelect: () => void;
}) {
  const { t } = useI18n();
  const roleLabel = t(workspaceRoleMessageKey(role));
  const item = applyStyles(styles.itemBetween);
  const icon = applyStyles(styles.iconMuted);
  return (
    <DropdownMenuItem
      aria-label={`${name}, ${roleLabel}`}
      className={item.className}
      onClick={onSelect}
      style={item.style}
    >
      <span {...applyStyles(styles.identity)}>
        <EntityIcon aria-hidden="true" className={icon.className} style={icon.style} />
        <span {...applyStyles(styles.truncate)}>{name}</span>
      </span>
      <RoleIcon role={role} />
    </DropdownMenuItem>
  );
}

export function AssociatedClubMenuItem({
  club,
  onSelect,
  selected,
}: {
  readonly club: WorkspaceSelectorClubOption;
  readonly onSelect: () => void;
  readonly selected: boolean;
}) {
  const { t } = useI18n();
  const roleLabel = t(workspaceRoleMessageKey(club.role));
  const item = applyStyles(styles.itemBetween);
  return (
    <DropdownMenuItem
      aria-current={selected ? "true" : undefined}
      aria-label={`${club.name}, ${roleLabel}`}
      className={item.className}
      data-active={selected ? "" : undefined}
      onClick={onSelect}
      style={item.style}
    >
      <span {...applyStyles(styles.identity)}>
        <ClubCrestAvatar imageUrl={club.imageUrl} name={club.name} />
        <span {...applyStyles(styles.truncate)}>{club.name}</span>
      </span>
      <RoleIcon role={club.role} />
    </DropdownMenuItem>
  );
}

export function RoleIcon({ role }: { readonly role: WorkspaceDisplayRole }) {
  const { t } = useI18n();
  const Icon = WORKSPACE_ROLE_ICONS[role];
  const label = t(workspaceRoleMessageKey(role));
  const trigger = applyStyles(styles.roleTrigger);
  const icon = applyStyles(styles.icon);
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className={trigger.className} style={trigger.style} tabIndex={-1} />}
      >
        <Icon aria-hidden="true" className={icon.className} style={icon.style} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function SelectorTriggerIcon({
  selection,
  clubs,
}: {
  readonly selection: WorkspaceSelection;
  readonly clubs: readonly WorkspaceSelectorClubOption[];
}) {
  const icon = applyStyles(styles.iconMuted);
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal: {
      const club =
        clubs.find((item) => item.externalClubId === selection.externalClubId) ?? clubs[0];
      return club ? (
        <ClubCrestAvatar imageUrl={club.imageUrl} name={club.name} />
      ) : (
        <PlusIcon aria-hidden="true" className={icon.className} style={icon.style} />
      );
    }
    case WORKSPACE_SELECTION_KIND.organization:
      return <BuildingsIcon aria-hidden="true" className={icon.className} style={icon.style} />;
    case WORKSPACE_SELECTION_KIND.competition:
      return <TrophyIcon aria-hidden="true" className={icon.className} style={icon.style} />;
    default: {
      const _exhaustive: never = selection;
      return _exhaustive;
    }
  }
}

export function selectorTriggerLabel(
  selection: WorkspaceSelection,
  personalLabel: string,
  organizationFallback: string,
  competitionFallback: string,
): string {
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return personalLabel;
    case WORKSPACE_SELECTION_KIND.organization:
      return selection.label ?? organizationFallback;
    case WORKSPACE_SELECTION_KIND.competition:
      return selection.label ?? competitionFallback;
    default: {
      const _exhaustive: never = selection;
      return _exhaustive;
    }
  }
}
