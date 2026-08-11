"use client";

import { useState } from "react";
import type {
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementSummaryDto,
  ExternalClubDto,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Field,
  FieldLabel,
  Input,
  MasterDetail,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Stat,
  StatGroup,
  StatHint,
  StatLabel,
  StatValue,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  useCopyToClipboard,
} from "@futrob/ui";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockCountdownIcon,
  CopyIcon,
  LinkIcon,
  LockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UsersThreeIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";

export type TeamConsoleCapabilities = {
  readonly manageRoster: boolean;
  readonly manageRoles: boolean;
  readonly manageInvitations: boolean;
  readonly manageExternalClub: boolean;
  readonly manageEntries: boolean;
  readonly unavailable: boolean;
};

export type CompetitionTeamsViewProps = {
  readonly items: readonly CompetitionTeamManagementSummaryDto[];
  readonly detail: CompetitionTeamManagementDetailResponse | null;
  readonly selectedTeamId: string | null;
  readonly loadingList?: boolean;
  readonly loadingDetail?: boolean;
  readonly busy?: boolean;
  readonly error?: SupportError | null;
  readonly capabilities: TeamConsoleCapabilities;
  readonly invitationUrl?: string | null;
  readonly onSelectTeam: (teamId: string | null) => void;
  readonly onChangeRole: (membershipId: string, role: RosterMembershipRoleDto) => Promise<void>;
  readonly onSetRosterOpen: (open: boolean) => Promise<void>;
  readonly onCreateInvitation: (input: {
    readonly role: RosterMembershipRoleDto;
    readonly redeemPolicy: "single" | "multi";
  }) => Promise<void>;
  readonly onSearchClubs: (query: string) => Promise<readonly ExternalClubDto[]>;
  readonly onConnectClub: (club: ExternalClubDto) => Promise<void>;
  readonly onDecideEntry: (decision: "approve" | "reject") => Promise<void>;
};

const roleLabel: Record<RosterMembershipRoleDto, string> = {
  player: "Jugador",
  captain: "Capitán",
  vice_captain: "Subcapitán",
};

export function CompetitionTeamsView(props: CompetitionTeamsViewProps) {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col bg-background text-foreground">
      <header className="border-b border-border px-5 py-5 sm:px-8">
        <p className="typo-label text-muted-foreground">Operación de competición</p>
        <h1 className="typo-heading mt-1">Equipos y plantillas</h1>
        <p className="typo-subtitle mt-2 text-muted-foreground">
          Gestiona inscripciones, cupos e identificación operativa de clubes EA.
        </p>
      </header>
      {props.error ? <SupportErrorAlert className="m-5 sm:mx-8" error={props.error} /> : null}
      {props.capabilities.unavailable ? (
        <Alert className="mx-5 mt-5 sm:mx-8" variant="warning">
          <LockIcon aria-hidden="true" />
          <AlertDescription>
            No pudimos confirmar tus permisos. Las acciones permanecen deshabilitadas.
          </AlertDescription>
        </Alert>
      ) : null}
      <MasterDetail
        className="min-h-[36rem]"
        detail={<TeamDetail {...props} />}
        master={<TeamList {...props} />}
        selectedId={props.selectedTeamId}
      />
    </main>
  );
}

function TeamList({ items, loadingList, selectedTeamId, onSelectTeam }: CompetitionTeamsViewProps) {
  if (loadingList) {
    return (
      <div aria-label="Cargando equipos" className="grid gap-3 p-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState className="m-4 min-h-72">
        <EmptyStateIcon>
          <UsersThreeIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>Aún no hay equipos</EmptyStateTitle>
        <EmptyStateDescription>
          Las inscripciones aparecerán aquí cuando un Team se asocie a esta competición.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  return (
    <nav aria-label="Equipos inscritos" className="grid gap-1 p-3">
      {items.map((item) => (
        <button
          aria-current={selectedTeamId === item.team.id ? "page" : undefined}
          className="min-h-16 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 aria-[current=page]:bg-primary/8"
          key={item.team.id}
          onClick={() => onSelectTeam(item.team.id)}
          type="button"
        >
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <strong className="block truncate text-sm">{item.team.name}</strong>
              <span className="typo-caption mt-1 block text-muted-foreground">
                {item.roster.memberCount}/{item.roster.maxSize} jugadores · {rosterState(item)}
              </span>
            </span>
            <EntryBadge status={item.entry.status} />
          </span>
        </button>
      ))}
    </nav>
  );
}

function TeamDetail(props: CompetitionTeamsViewProps) {
  if (!props.selectedTeamId) {
    return (
      <EmptyState className="m-5 flex-1 border-0">
        <EmptyStateIcon>
          <UsersThreeIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>Selecciona un equipo</EmptyStateTitle>
        <EmptyStateDescription>
          Elige un Team para revisar su inscripción, plantilla y club asociado.
        </EmptyStateDescription>
      </EmptyState>
    );
  }
  if (props.loadingDetail || !props.detail) {
    return (
      <div aria-label="Cargando detalle del equipo" className="grid gap-4 p-5 sm:p-8">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const { detail, capabilities } = props;
  return (
    <div className="grid gap-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Button
            className="mb-3 md:hidden"
            onClick={() => props.onSelectTeam(null)}
            variant="ghost"
          >
            <ArrowLeftIcon aria-hidden="true" /> Volver a equipos
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="typo-heading truncate">{detail.team.name}</h2>
            <EntryBadge status={detail.entry.status} />
          </div>
          <p className="typo-caption mt-2 text-muted-foreground">
            {detail.externalClub
              ? `${detail.externalClub.externalClubName} · ${detail.externalClub.platform}`
              : "Sin club EA asociado"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {capabilities.manageInvitations ? <InvitationDialog {...props} /> : null}
          {capabilities.manageExternalClub ? <ExternalClubDialog {...props} /> : null}
        </div>
      </div>

      <StatGroup className="rounded-lg bg-muted p-4">
        <Stat>
          <StatLabel>Cupo</StatLabel>
          <StatValue size="compact">
            {detail.roster.memberCount}/{detail.roster.maxSize}
          </StatValue>
          <StatHint>
            {detail.roster.memberCount >= detail.roster.maxSize
              ? "Plantilla llena"
              : "Jugadores registrados"}
          </StatHint>
        </Stat>
        <Stat>
          <StatLabel>Plantilla</StatLabel>
          <StatValue size="compact">
            {detail.roster.state === "open" ? "Abierta" : "Cerrada"}
          </StatValue>
          <StatHint>
            {detail.roster.lockedAt ? "Bloqueada para nuevos ingresos" : "Admite invitaciones"}
          </StatHint>
        </Stat>
        <Stat>
          <StatLabel>Inscripción</StatLabel>
          <StatValue size="compact">{entryStatusLabel(detail.entry.status)}</StatValue>
        </Stat>
      </StatGroup>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Plantilla</h3>
        {capabilities.manageRoster ? (
          <ConfirmAction
            confirmLabel={detail.roster.state === "open" ? "Cerrar plantilla" : "Abrir plantilla"}
            description={
              detail.roster.state === "open"
                ? "Los enlaces existentes dejarán de admitir nuevos ingresos mientras esté cerrada."
                : "La plantilla volverá a admitir ingresos por invitación si tiene cupo."
            }
            disabled={props.busy}
            onConfirm={() => props.onSetRosterOpen(detail.roster.state !== "open")}
            triggerLabel={detail.roster.state === "open" ? "Cerrar plantilla" : "Abrir plantilla"}
          />
        ) : null}
      </div>

      <Table dense>
        <TableHeader>
          <TableRow>
            <TableHead>Jugador</TableHead>
            <TableHead>Rol</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detail.members.length === 0 ? (
            <TableRow>
              <TableEmpty colSpan={2}>La plantilla está vacía.</TableEmpty>
            </TableRow>
          ) : (
            detail.members.map((member) => (
              <TableRow key={member.membership.id}>
                <TableCell>
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-8">
                      {member.presentation.avatarUrl ? (
                        <AvatarImage alt="" src={member.presentation.avatarUrl} />
                      ) : null}
                      <AvatarFallback>
                        {initialsFromName(member.presentation.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium">{member.presentation.displayName}</span>
                  </span>
                </TableCell>
                <TableCell>
                  {capabilities.manageRoles ? (
                    <Select
                      disabled={props.busy}
                      onValueChange={(role) =>
                        runAction(() =>
                          props.onChangeRole(member.membership.id, role as RosterMembershipRoleDto),
                        )
                      }
                      value={member.membership.role}
                    >
                      <SelectTrigger
                        aria-label={`Rol de ${member.presentation.displayName}`}
                        className="w-40"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabel).map(([role, label]) => (
                          <SelectItem key={role} value={role}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span>{roleLabel[member.membership.role]}</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {capabilities.manageEntries && detail.entry.status === "pending" ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Decidir inscripción</h3>
            <p className="typo-caption mt-1 text-muted-foreground">
              La decisión afecta la elegibilidad del Team, no la propiedad de su club EA.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ConfirmAction
              confirmLabel="Rechazar inscripción"
              description="El Team quedará rechazado para esta competición."
              disabled={props.busy}
              onConfirm={() => props.onDecideEntry("reject")}
              triggerLabel="Rechazar"
              variant="destructive"
            />
            <ConfirmAction
              confirmLabel="Aprobar inscripción"
              description="El Team quedará habilitado para participar cuando cumpla las demás reglas."
              disabled={props.busy}
              onConfirm={() => props.onDecideEntry("approve")}
              triggerLabel="Aprobar"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InvitationDialog(props: CompetitionTeamsViewProps) {
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
          {props.invitationUrl ? (
            <div className="rounded-lg bg-muted p-3">
              <p className="typo-label text-muted-foreground">Enlace creado</p>
              <p className="mt-1 break-all text-sm">{props.invitationUrl}</p>
              <Button
                className="mt-3"
                onClick={() => void copyToClipboard(props.invitationUrl!)}
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
            disabled={props.busy}
            onClick={() =>
              runAction(() => props.onCreateInvitation({ role, redeemPolicy: policy }))
            }
          >
            Crear invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExternalClubDialog(props: CompetitionTeamsViewProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly ExternalClubDto[]>([]);
  const [searching, setSearching] = useState(false);
  async function search() {
    if (!query.trim() || searching) return;
    setSearching(true);
    try {
      setResults(await props.onSearchClubs(query.trim()));
    } catch {
      setResults([]);
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
                onClick={() => runAction(() => props.onConnectClub(club))}
              >
                Vincular
              </DialogClose>
            </li>
          ))}
        </ul>
        {results.length === 0 ? (
          <p className="typo-caption mt-4 text-muted-foreground">
            Busca por nombre para elegir un club.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmAction({
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

function EntryBadge({ status }: Readonly<{ status: "pending" | "approved" | "rejected" }>) {
  const icon =
    status === "approved" ? (
      <CheckCircleIcon aria-hidden="true" />
    ) : status === "rejected" ? (
      <XCircleIcon aria-hidden="true" />
    ) : (
      <ClockCountdownIcon aria-hidden="true" />
    );
  return (
    <Badge
      variant={
        status === "approved" ? "approved" : status === "rejected" ? "destructive" : "warning"
      }
    >
      {icon}
      {entryStatusLabel(status)}
    </Badge>
  );
}

function entryStatusLabel(status: "pending" | "approved" | "rejected"): string {
  return status === "approved" ? "Aprobada" : status === "rejected" ? "Rechazada" : "Pendiente";
}

function rosterState(item: CompetitionTeamManagementSummaryDto): string {
  return item.roster.state === "open" ? "abierta" : "cerrada";
}

function runAction(action: () => Promise<void>): void {
  void action().catch(() => undefined);
}
