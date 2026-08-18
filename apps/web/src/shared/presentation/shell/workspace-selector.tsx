"use client";

import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@futrob/ui";
import { BuildingsIcon, CaretDownIcon, PlusIcon, TrophyIcon } from "@phosphor-icons/react";
import type { ComponentType, SVGProps } from "react";
import { CreateOrganizationForm } from "@/modules/organizations/presentation/create-organization-form.tsx";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  WORKSPACE_SELECTION_KIND,
  type WorkspaceSelection,
  pathForWorkspaceSelection,
  personalWorkspaceSelection,
} from "./workspace-selection.ts";
import { writeStoredWorkspaceSelection } from "./workspace-selection-storage.ts";
import {
  type WorkspaceDisplayRole,
  type WorkspaceSelectorClubOption,
  type WorkspaceSelectorModel,
  type WorkspaceSelectorOrgOption,
} from "./workspace-selector-model.ts";
import { WORKSPACE_ROLE_ICONS, workspaceRoleMessageKey } from "./workspace-role-icons.ts";

type CompetitionHostDialog =
  | { readonly kind: "closed" }
  | { readonly kind: "create-organization-for-competition" }
  | {
      readonly kind: "pick-organization";
      readonly organizations: readonly WorkspaceSelectorOrgOption[];
    };

export function WorkspaceSelector({
  selection,
  model,
  onSelect,
  onRequestAddClub,
}: {
  readonly selection: WorkspaceSelection;
  readonly model: WorkspaceSelectorModel;
  readonly onSelect: (selection: WorkspaceSelection) => void;
  readonly onRequestAddClub: () => void;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t } = useI18n();
  const [dialog, setDialog] = useState<CompetitionHostDialog>({ kind: "closed" });

  const selectedClub =
    selection.kind === WORKSPACE_SELECTION_KIND.personal
      ? (model.clubs.find((club) => club.externalClubId === selection.externalClubId) ??
        model.clubs[0])
      : model.clubs[0];
  const personalLabel = selectedClub?.name ?? t("shell.workspace.addClub");

  function choose(next: WorkspaceSelection) {
    writeStoredWorkspaceSelection(next);
    onSelect(next);
    void navigate({ to: pathForWorkspaceSelection(next) });
  }

  function chooseClub(externalClubId: string) {
    const next = personalWorkspaceSelection(externalClubId);
    writeStoredWorkspaceSelection(next);
    onSelect(next);
    if (!pathname.startsWith("/player")) {
      void navigate({ to: pathForWorkspaceSelection(next) });
    }
  }

  function handleCreateCompetition() {
    const intent = model.createCompetitionIntent;
    switch (intent.kind) {
      case "create-organization":
        setDialog({ kind: "create-organization-for-competition" });
        return;
      case "navigate":
        void navigate({
          to: "/orgs/$orgId/competitions/new",
          params: { orgId: intent.organizationId },
        });
        return;
      case "pick-organization":
        setDialog({ kind: "pick-organization", organizations: intent.organizations });
        return;
      default: {
        const _exhaustive: never = intent;
        return _exhaustive;
      }
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="group w-full justify-between font-medium" dense variant="outline" />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <SelectorTriggerIcon clubs={model.clubs} selection={selection} />
            <span className="truncate">
              {selectorTriggerLabel(
                selection,
                personalLabel,
                t("shell.workspace.organizationFallback"),
                t("shell.workspace.competitionFallback"),
              )}
            </span>
          </span>
          <CaretDownIcon
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-(--duration-normal) ease-(--ease-emphasized) group-aria-expanded:rotate-180"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <TooltipProvider>
            <DropdownMenuGroup>
              <SectionHeaderAction
                actionLabel={t("shell.workspace.createCompetition")}
                onAction={handleCreateCompetition}
                title={t("shell.workspace.competitions")}
              />
              {model.competitions.length === 0 ? (
                <DropdownMenuItem disabled>{t("shell.workspace.noCompetitions")}</DropdownMenuItem>
              ) : (
                model.competitions.map((competition) => (
                  <RoleAwareMenuItem
                    EntityIcon={TrophyIcon}
                    key={competition.competitionId}
                    name={competition.name}
                    onSelect={() =>
                      choose({
                        kind: WORKSPACE_SELECTION_KIND.competition,
                        competitionId: competition.competitionId,
                        organizationId: competition.organizationId,
                        label: competition.name,
                      })
                    }
                    role={competition.role}
                  />
                ))
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <SectionHeaderAction
                actionLabel={t("shell.workspace.addClub")}
                onAction={onRequestAddClub}
                title={t("shell.workspace.eaClubs")}
              />
              {model.clubs.length === 0 ? (
                <DropdownMenuItem disabled>{t("shell.workspace.noClubs")}</DropdownMenuItem>
              ) : (
                model.clubs.map((club) => (
                  <AssociatedClubMenuItem
                    club={club}
                    key={club.externalClubId}
                    onSelect={() => chooseClub(club.externalClubId)}
                    selected={
                      selection.kind === WORKSPACE_SELECTION_KIND.personal &&
                      selection.externalClubId === club.externalClubId
                    }
                  />
                ))
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <SectionHeaderAction
                actionLabel={t("shell.workspace.createOrganization")}
                onAction={() => {
                  void navigate({ to: "/orgs/new" });
                }}
                title={t("shell.workspace.organizations")}
              />
              {model.organizations.length === 0 ? (
                <DropdownMenuItem disabled>{t("shell.workspace.noOrganizations")}</DropdownMenuItem>
              ) : (
                model.organizations.map((membership) => (
                  <RoleAwareMenuItem
                    EntityIcon={BuildingsIcon}
                    key={membership.organizationId}
                    name={membership.name}
                    onSelect={() =>
                      choose({
                        kind: WORKSPACE_SELECTION_KIND.organization,
                        organizationId: membership.organizationId,
                        label: membership.name,
                      })
                    }
                    role={membership.role}
                  />
                ))
              )}
            </DropdownMenuGroup>
          </TooltipProvider>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
        open={dialog.kind === "create-organization-for-competition"}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shell.workspace.createOrganizationForCompetition.title")}</DialogTitle>
            <DialogDescription>
              {t("shell.workspace.createOrganizationForCompetition.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5">
            <CreateOrganizationForm
              onCreated={(created) => {
                setDialog({ kind: "closed" });
                void navigate({
                  to: "/orgs/$orgId/competitions/new",
                  params: { orgId: created.organizationId },
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
        open={dialog.kind === "pick-organization"}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shell.workspace.pickOrganization.title")}</DialogTitle>
            <DialogDescription>
              {t("shell.workspace.pickOrganization.description")}
            </DialogDescription>
          </DialogHeader>
          <TooltipProvider>
            <ul className="mt-5 grid gap-2">
              {(dialog.kind === "pick-organization" ? dialog.organizations : []).map(
                (organization) => {
                  const roleLabel = t(workspaceRoleMessageKey(organization.role));
                  return (
                    <li key={organization.organizationId}>
                      <Button
                        aria-label={`${organization.name}, ${roleLabel}`}
                        className="w-full justify-between"
                        onClick={() => {
                          setDialog({ kind: "closed" });
                          void navigate({
                            to: "/orgs/$orgId/competitions/new",
                            params: { orgId: organization.organizationId },
                          });
                        }}
                        variant="outline"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <BuildingsIcon aria-hidden="true" className="size-4 shrink-0" />
                          <span className="truncate">{organization.name}</span>
                        </span>
                        <RoleIcon role={organization.role} />
                      </Button>
                    </li>
                  );
                },
              )}
            </ul>
          </TooltipProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SectionHeaderAction({
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

function RoleAwareMenuItem({
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

function AssociatedClubMenuItem({
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

function RoleIcon({ role }: { readonly role: WorkspaceDisplayRole }) {
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

function SelectorTriggerIcon({
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

function selectorTriggerLabel(
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
