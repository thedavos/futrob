"use client";

import type { ComponentType, SVGProps } from "react";
import {
  DropdownMenuLabel,
  DropdownMenuItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@futrob/ui";
import { BuildingsIcon, PlusIcon, TrophyIcon } from "@phosphor-icons/react";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";
import {
  type WorkspaceDisplayRole,
  type WorkspaceSelectorClubOption,
} from "./workspace-selector-model.ts";
import { WORKSPACE_ROLE_ICONS, workspaceRoleMessageKey } from "./workspace-role-icons.ts";

export function SectionHeaderAction({
  title,
  actionLabel,
  onAction,
}: {
  readonly title: string;
  readonly actionLabel: string;
  readonly onAction: () => void;
}) {
  return (
    <div className="flex items-center">
      <DropdownMenuLabel className="min-w-0 flex-1 py-1.5 pe-1">{title}</DropdownMenuLabel>
      <DropdownMenuItem
        aria-label={actionLabel}
        className="size-(--control-height-dense) min-h-(--control-height-dense) shrink-0 justify-center p-0 text-muted-foreground max-sm:size-(--control-height-touch) max-sm:min-h-(--control-height-touch)"
        onClick={onAction}
      >
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" tabIndex={-1} />}>
            <PlusIcon aria-hidden="true" className="size-4" />
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
  return (
    <DropdownMenuItem
      aria-label={`${name}, ${roleLabel}`}
      className="justify-between"
      onClick={onSelect}
    >
      <span className="flex min-w-0 items-center gap-2">
        <EntityIcon aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{name}</span>
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
  return (
    <DropdownMenuItem
      aria-current={selected ? "true" : undefined}
      aria-label={`${club.name}, ${roleLabel}`}
      className="justify-between"
      data-active={selected ? "" : undefined}
      onClick={onSelect}
    >
      <span className="flex min-w-0 items-center gap-2">
        <ClubCrestAvatar imageUrl={club.imageUrl} name={club.name} />
        <span className="truncate">{club.name}</span>
      </span>
      <RoleIcon role={club.role} />
    </DropdownMenuItem>
  );
}

export function RoleIcon({ role }: { readonly role: WorkspaceDisplayRole }) {
  const { t } = useI18n();
  const Icon = WORKSPACE_ROLE_ICONS[role];
  const label = t(workspaceRoleMessageKey(role));
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="ml-auto inline-flex shrink-0 text-muted-foreground" tabIndex={-1} />
        }
      >
        <Icon aria-hidden="true" className="size-4" />
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
  const className = "size-4 shrink-0 text-muted-foreground";
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal: {
      const club =
        clubs.find((item) => item.externalClubId === selection.externalClubId) ?? clubs[0];
      return club ? (
        <ClubCrestAvatar imageUrl={club.imageUrl} name={club.name} />
      ) : (
        <PlusIcon aria-hidden="true" className={className} />
      );
    }
    case WORKSPACE_SELECTION_KIND.organization:
      return <BuildingsIcon aria-hidden="true" className={className} />;
    case WORKSPACE_SELECTION_KIND.competition:
      return <TrophyIcon aria-hidden="true" className={className} />;
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
