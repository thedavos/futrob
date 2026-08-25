"use client";

import { useState } from "react";
import type { ExternalClubDto, RosterMembershipRoleDto } from "@futrob/api-contracts";
import { rosterMembershipRoleSchema } from "@futrob/api-contracts";
import {
  applyStyles,
  typography,
  vis,
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
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useCopyToClipboard,
} from "@futrob/ui";
import {
  CheckIcon,
  CopyIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { runAction } from "@/shared/presentation/run-action.ts";
import { styles } from "./competition-team-actions.styles.ts";

const copy = applyStyles(styles.copy);
const searchAlert = applyStyles(styles.searchAlert);
const roleTrigger = applyStyles(styles.roleTrigger);

export const roleLabel = {
  player: "Jugador",
  captain: "Capitán",
  vice_captain: "Subcapitán",
} satisfies Record<RosterMembershipRoleDto, string>;

export function InvitationDialog({
  busy,
  invitationUrl,
  onCreateInvitation,
}: Readonly<{
  busy?: boolean;
  invitationUrl?: string | null;
  onCreateInvitation: (input: {
    readonly role: RosterMembershipRoleDto;
    readonly redeemPolicy: "single" | "multi";
  }) => Promise<void>;
}>) {
  const [role, setRole] = useState<RosterMembershipRoleDto>("player");
  const [policy, setPolicy] = useState<"single" | "multi">("single");
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <PlusIcon aria-hidden="true" /> Invitar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear invitación de plantilla</DialogTitle>
          <DialogDescription>
            El enlace solo da acceso a este Team y respeta el cupo y estado actuales.
          </DialogDescription>
        </DialogHeader>
        <div {...applyStyles(styles.fields)}>
          <Field name="invitation-role">
            <FieldLabel>Rol inicial</FieldLabel>
            <Select
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
                {Object.entries(roleLabel).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="invitation-policy">
            <FieldLabel>Usos</FieldLabel>
            <Select
              onValueChange={(value) => {
                if (value === "single" || value === "multi") setPolicy(value);
              }}
              value={policy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Un solo uso</SelectItem>
                <SelectItem value="multi">Varios usos</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {invitationUrl ? (
            <div {...applyStyles(styles.created)}>
              <p {...applyStyles(typography.label, styles.createdLabel)}>Enlace creado</p>
              <p {...applyStyles(styles.createdUrl)}>{invitationUrl}</p>
              <Button
                className={copy.className}
                onClick={() => void copyToClipboard(invitationUrl)}
                style={copy.style}
                variant="outline"
              >
                {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                {isCopied ? "Copiado" : "Copiar enlace"}
              </Button>
              <span aria-live="polite" {...applyStyles(vis.srOnly)}>
                {isCopied ? "Enlace copiado" : ""}
              </span>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
          <Button
            disabled={busy}
            onClick={() => runAction(() => onCreateInvitation({ role, redeemPolicy: policy }))}
          >
            Crear invitación
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
        <LinkIcon aria-hidden="true" /> Vincular club
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buscar club EA</DialogTitle>
          <DialogDescription>
            Esta asociación es operativa para localizar partidos. No verifica propiedad.
          </DialogDescription>
        </DialogHeader>
        <div {...applyStyles(styles.search)}>
          <Input
            aria-label="Nombre del club EA"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej. Cuervos"
            value={query}
          />
          <Button disabled={!query.trim() || searching} onClick={() => runAction(search)}>
            <MagnifyingGlassIcon aria-hidden="true" /> {searching ? "Buscando…" : "Buscar"}
          </Button>
        </div>
        <ul {...applyStyles(styles.results)}>
          {results.map((club) => (
            <li
              key={`${club.providerKey}:${club.externalClubId}`}
              {...applyStyles(styles.result)}
            >
              <span {...applyStyles(styles.resultCopy)}>
                <strong {...applyStyles(styles.resultName)}>{club.name}</strong>
                <span {...applyStyles(typography.caption, styles.resultMeta)}>
                  {club.platform} · {club.gameEdition}
                </span>
              </span>
              <DialogClose
                render={<Button variant="outline" />}
                onClick={() => runAction(() => onConnectClub(club))}
              >
                Vincular
              </DialogClose>
            </li>
          ))}
        </ul>
        {searchFailed ? (
          <Alert className={searchAlert.className} style={searchAlert.style} variant="destructive">
            <AlertDescription>
              No pudimos buscar clubes. Conservamos tu selección para que puedas reintentar.
            </AlertDescription>
          </Alert>
        ) : results.length === 0 ? (
          <p {...applyStyles(typography.caption, styles.searchHint)}>
            Busca por nombre para elegir un club.
          </p>
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
  const [pendingRole, setPendingRole] = useState<RosterMembershipRoleDto | null>(null);
  return (
    <>
      <Select
        disabled={busy}
        onValueChange={(value) => {
          if (!value) return;
          setPendingRole(rosterMembershipRoleSchema.parse(value));
        }}
        value={role}
      >
        <SelectTrigger
          aria-label={`Rol de ${displayName}`}
          className={roleTrigger.className}
          style={roleTrigger.style}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(roleLabel).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
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
            <AlertDialogTitle>Confirmar cambio de rol</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRole
                ? `${displayName} pasará a tener el rol ${roleLabel[pendingRole].toLowerCase()}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="ghost" />}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              render={<Button />}
              onClick={() => {
                if (!pendingRole) return;
                const nextRole = pendingRole;
                setPendingRole(null);
                runAction(() => onChangeRole(membershipId, nextRole));
              }}
            >
              Cambiar rol
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
          <AlertDialogCancel render={<Button variant="ghost" />}>Cancelar</AlertDialogCancel>
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
