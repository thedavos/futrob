"use client";

import { useState } from "react";
import type { ExternalClubDto, RosterMembershipRoleDto } from "@futrob/api-contracts";
import { rosterMembershipRoleSchema } from "@futrob/api-contracts";
import {
  applyStyles,
  typography,
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@futrob/ui";
import { LinkIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { eaPlatformLabel } from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { runAction } from "@/shared/presentation/run-action.ts";
import { styles } from "./competition-team-actions.styles.ts";
import { InvitationLinkPanel } from "./invitation-link-panel.tsx";
import { ROSTER_ROLES, useRoleLabels } from "./roster-role-labels.ts";

const searchAlert = applyStyles(styles.searchAlert);
const roleTrigger = applyStyles(styles.roleTrigger);

export type CreateInvitationInput = {
  readonly role: RosterMembershipRoleDto;
  readonly redeemPolicy: "single" | "multi";
  readonly inviteeIdentifier: string | null;
  readonly message: string | null;
};

export function InvitationDialog({
  busy,
  disabled,
  allowedRoles = ROSTER_ROLES,
  invitationUrl,
  onCreateInvitation,
}: Readonly<{
  busy?: boolean;
  disabled?: boolean;
  /** Roles the actor may hand out; anything above player needs role-management rights. */
  allowedRoles?: readonly RosterMembershipRoleDto[];
  invitationUrl?: string | null;
  onCreateInvitation: (input: CreateInvitationInput) => Promise<void>;
}>) {
  const { t } = useI18n();
  const roleLabel = useRoleLabels();
  const [role, setRole] = useState<RosterMembershipRoleDto>("player");
  const [policy, setPolicy] = useState<"single" | "multi">("single");
  const [inviteeIdentifier, setInviteeIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const roleItems = allowedRoles.map((value) => ({ value, label: roleLabel[value] }));
  const policyItems = [
    { value: "single", label: t("roster.invite.uses.single") },
    { value: "multi", label: t("roster.invite.uses.multi") },
  ];
  const onlyPlayers = allowedRoles.length === 1;
  // Links for captain or vice-captain roles are always single use; the API enforces it too.
  const rolePolicy = role === "player" ? policy : "single";
  return (
    <Dialog>
      <DialogTrigger disabled={disabled} render={<Button variant="outline" />}>
        <PlusIcon aria-hidden="true" /> {t("roster.invite.trigger")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("roster.invite.title")}</DialogTitle>
          <DialogDescription>{t("roster.invite.description")}</DialogDescription>
        </DialogHeader>
        <div {...applyStyles(styles.fields)}>
          <Field name="invitation-role">
            <FieldLabel>{t("roster.invite.role")}</FieldLabel>
            <Select
              disabled={onlyPlayers}
              items={roleItems}
              onValueChange={(value) => {
                if (!value) return;
                setRole(rosterMembershipRoleSchema.parse(value));
              }}
              value={role}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onlyPlayers ? (
              <FieldDescription>{t("roster.invite.rolesRestricted")}</FieldDescription>
            ) : null}
          </Field>
          {role === "player" ? (
            <Field name="invitation-policy">
              <FieldLabel>{t("roster.invite.uses")}</FieldLabel>
              <Select
                items={policyItems}
                onValueChange={(value) => {
                  if (value === "single" || value === "multi") setPolicy(value);
                }}
                value={policy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {policyItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field name="invitation-invitee">
            <FieldLabel>{t("roster.invite.invitee")}</FieldLabel>
            <Input
              autoComplete="off"
              onChange={(event) => setInviteeIdentifier(event.target.value)}
              placeholder={t("roster.invite.inviteePlaceholder")}
              value={inviteeIdentifier}
            />
            <FieldDescription>{t("roster.invite.inviteeHint")}</FieldDescription>
          </Field>
          <Field name="invitation-message">
            <FieldLabel>{t("roster.invite.message")}</FieldLabel>
            <Textarea
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("roster.invite.messagePlaceholder")}
              rows={3}
              value={message}
            />
          </Field>
          {invitationUrl ? <InvitationLinkPanel url={invitationUrl} /> : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t("common.cancel")}</DialogClose>
          <Button
            disabled={busy}
            onClick={() =>
              runAction(() =>
                onCreateInvitation({
                  role,
                  redeemPolicy: rolePolicy,
                  inviteeIdentifier: inviteeIdentifier.trim() || null,
                  message: message.trim() || null,
                }),
              )
            }
          >
            {t("roster.invite.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExternalClubDialog({
  onConnectClub,
  onSearchClubs,
}: Readonly<{
  onSearchClubs: (query: string) => Promise<readonly ExternalClubDto[]>;
  onConnectClub: (club: ExternalClubDto) => Promise<void>;
}>) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly ExternalClubDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  async function search() {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchFailed(false);
    try {
      setResults(await onSearchClubs(query.trim()));
    } catch {
      setResults([]);
      setSearchFailed(true);
    } finally {
      setSearching(false);
    }
  }
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <LinkIcon aria-hidden="true" /> {t("roster.club.trigger")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("roster.club.title")}</DialogTitle>
          <DialogDescription>{t("roster.club.description")}</DialogDescription>
        </DialogHeader>
        <div {...applyStyles(styles.search)}>
          <Input
            aria-label={t("roster.club.nameAria")}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("roster.club.placeholder")}
            value={query}
          />
          <Button disabled={!query.trim() || searching} onClick={() => runAction(search)}>
            <MagnifyingGlassIcon aria-hidden="true" />{" "}
            {searching ? t("roster.club.searching") : t("roster.club.search")}
          </Button>
        </div>
        <ul {...applyStyles(styles.results)}>
          {results.map((club) => (
            <li key={`${club.providerKey}:${club.externalClubId}`} {...applyStyles(styles.result)}>
              <span {...applyStyles(styles.resultCopy)}>
                <strong {...applyStyles(styles.resultName)}>{club.name}</strong>
                <span {...applyStyles(typography.caption, styles.resultMeta)}>
                  {eaPlatformLabel(club.platform)} · {club.gameEdition}
                </span>
              </span>
              <DialogClose
                render={<Button variant="outline" />}
                onClick={() => runAction(() => onConnectClub(club))}
              >
                {t("roster.club.select")}
              </DialogClose>
            </li>
          ))}
        </ul>
        {searchFailed ? (
          <Alert className={searchAlert.className} style={searchAlert.style} variant="destructive">
            <AlertDescription>{t("roster.club.searchFailed")}</AlertDescription>
          </Alert>
        ) : results.length === 0 ? (
          <p {...applyStyles(typography.caption, styles.searchHint)}>{t("roster.club.hint")}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function RosterRoleEditor({
  busy,
  displayName,
  membershipId,
  onChangeRole,
  role,
}: Readonly<{
  busy?: boolean;
  displayName: string;
  membershipId: string;
  onChangeRole: (membershipId: string, role: RosterMembershipRoleDto) => Promise<void>;
  role: RosterMembershipRoleDto;
}>) {
  const { t } = useI18n();
  const roleLabel = useRoleLabels();
  const roleItems = ROSTER_ROLES.map((value) => ({ value, label: roleLabel[value] }));
  const [pendingRole, setPendingRole] = useState<RosterMembershipRoleDto | null>(null);
  return (
    <>
      <Select
        disabled={busy}
        items={roleItems}
        onValueChange={(value) => {
          if (!value) return;
          setPendingRole(rosterMembershipRoleSchema.parse(value));
        }}
        value={role}
      >
        <SelectTrigger
          aria-label={t("roster.role.aria", { name: displayName })}
          className={roleTrigger.className}
          style={roleTrigger.style}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setPendingRole(null);
        }}
        open={pendingRole !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roster.role.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRole
                ? t("roster.role.confirmDescription", {
                    name: displayName,
                    role: roleLabel[pendingRole].toLowerCase(),
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="ghost" />}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              render={<Button />}
              onClick={() => {
                if (!pendingRole) return;
                const nextRole = pendingRole;
                setPendingRole(null);
                runAction(() => onChangeRole(membershipId, nextRole));
              }}
            >
              {t("roster.role.confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ConfirmAction({
  triggerLabel,
  confirmLabel,
  description,
  disabled,
  onConfirm,
  variant = "outline",
}: Readonly<{
  triggerLabel: string;
  confirmLabel: string;
  description: string;
  disabled?: boolean;
  onConfirm: () => Promise<void>;
  variant?: "outline" | "destructive";
}>) {
  const { t } = useI18n();
  return (
    <AlertDialog>
      <AlertDialogTrigger disabled={disabled} render={<Button variant={variant} />}>
        {triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmLabel}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="ghost" />}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant={variant} />}
            onClick={() => runAction(onConfirm)}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
