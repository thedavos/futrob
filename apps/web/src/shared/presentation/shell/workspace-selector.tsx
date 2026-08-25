"use client";

import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  TooltipProvider,
} from "@futrob/ui";
import { BuildingsIcon, CaretDownIcon, TrophyIcon } from "@phosphor-icons/react";
import { CreateOrganizationForm } from "@/modules/organizations/presentation/create-organization-form.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  WORKSPACE_SELECTION_KIND,
  type WorkspaceSelection,
  pathForWorkspaceSelection,
  personalWorkspaceSelection,
} from "./workspace-selection.ts";
import { writeStoredWorkspaceSelection } from "./workspace-selection-storage.ts";
import type {
  WorkspaceSelectorModel,
  WorkspaceSelectorOrgOption,
} from "./workspace-selector-model.ts";
import {
  AssociatedClubMenuItem,
  RoleAwareMenuItem,
  RoleIcon,
  SectionHeaderAction,
  SelectorTriggerIcon,
  selectorTriggerLabel,
} from "./workspace-selector-items.tsx";
import { workspaceRoleMessageKey } from "./workspace-role-icons.ts";

const styles = stylex.create({
  trigger: {
    width: "100%",
    justifyContent: "space-between",
    fontWeight: 500,
  },
  triggerLabel: {
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
  caret: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
    transitionProperty: "transform",
    transitionDuration: "var(--duration-normal)",
    transitionTimingFunction: "var(--ease-emphasized)",
  },
  menu: {
    minWidth: "14rem",
  },
  dialogBody: {
    marginTop: "1.25rem",
  },
  orgList: {
    marginTop: "1.25rem",
    display: "grid",
    gap: "0.5rem",
  },
  orgButton: {
    width: "100%",
    justifyContent: "space-between",
  },
  orgIdentity: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  orgIcon: {
    width: "1rem",
    height: "1rem",
    flexShrink: 0,
  },
});

export {
  AssociatedClubMenuItem,
  RoleAwareMenuItem,
  RoleIcon,
  SectionHeaderAction,
  SelectorTriggerIcon,
  selectorTriggerLabel,
} from "./workspace-selector-items.tsx";

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

  const trigger = applyStyles(styles.trigger);
  const caret = applyStyles(styles.caret);
  const menu = applyStyles(styles.menu);
  const orgButton = applyStyles(styles.orgButton);
  const orgIcon = applyStyles(styles.orgIcon);
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
            <Button className={trigger.className} dense style={trigger.style} variant="outline" />
          }
        >
          <span {...applyStyles(styles.triggerLabel)}>
            <SelectorTriggerIcon clubs={model.clubs} selection={selection} />
            <span {...applyStyles(styles.truncate)}>
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
            className={caret.className}
            data-caret="expand"
            style={caret.style}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={menu.className} style={menu.style}>
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
          <div {...applyStyles(styles.dialogBody)}>
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
            <ul {...applyStyles(styles.orgList)}>
              {(dialog.kind === "pick-organization" ? dialog.organizations : []).map(
                (organization) => {
                  const roleLabel = t(workspaceRoleMessageKey(organization.role));
                  return (
                    <li key={organization.organizationId}>
                      <Button
                        aria-label={`${organization.name}, ${roleLabel}`}
                        className={orgButton.className}
                        onClick={() => {
                          setDialog({ kind: "closed" });
                          void navigate({
                            to: "/orgs/$orgId/competitions/new",
                            params: { orgId: organization.organizationId },
                          });
                        }}
                        style={orgButton.style}
                        variant="outline"
                      >
                        <span {...applyStyles(styles.orgIdentity)}>
                          <BuildingsIcon
                            aria-hidden="true"
                            className={orgIcon.className}
                            style={orgIcon.style}
                          />
                          <span {...applyStyles(styles.truncate)}>{organization.name}</span>
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
