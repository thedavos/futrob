"use client";

import { useState } from "react";
import type { ExternalClubDto, RosterMembershipRoleDto } from "@futrob/api-contracts";
import {
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

export const roleLabel: Record<RosterMembershipRoleDto, string> = {
  player: "Jugador",
  captain: "Capitán",
  vice_captain: "Subcapitán",
};

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
        <div className="mt-5 grid gap-4">
          <Field name="invitation-role">
            <FieldLabel>Rol inicial</FieldLabel>
            <Select
              onValueChange={(value) => setRole(value as RosterMembershipRoleDto)}
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
              onValueChange={(value) => setPolicy(value as "single" | "multi")}
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
            <div className="rounded-lg bg-muted p-3">
              <p className="typo-label text-muted-foreground">Enlace creado</p>
              <p className="mt-1 break-all text-sm">{invitationUrl}</p>
              <Button
                className="mt-3"
                onClick={() => void copyToClipboard(invitationUrl)}
                variant="outline"
              >
                {isCopied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
                {isCopied ? "Copiado" : "Copiar enlace"}
              </Button>
              <span aria-live="polite" className="sr-only">
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
        <div className="mt-5 flex gap-2">
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
        <ul className="mt-4 grid max-h-72 gap-2 overflow-y-auto">
          {results.map((club) => (
            <li
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              key={`${club.providerKey}:${club.externalClubId}`}
            >
              <span className="min-w-0">
                <strong className="block truncate text-sm">{club.name}</strong>
                <span className="typo-caption text-muted-foreground">
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
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>
              No pudimos buscar clubes. Conservamos tu selección para que puedas reintentar.
            </AlertDescription>
          </Alert>
        ) : results.length === 0 ? (
          <p className="typo-caption mt-4 text-muted-foreground">
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
        onValueChange={(value) => setPendingRole(value as RosterMembershipRoleDto)}
        value={role}
      >
        <SelectTrigger aria-label={`Rol de ${displayName}`} className="w-40">
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

function runAction(action: () => Promise<void>): void {
  void action().catch(() => undefined);
}
