"use client";

import type {
  CompetitionTeamManagementDetailResponse,
  CompetitionTeamManagementSummaryDto,
  ExternalClubDto,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  MasterDetail,
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
} from "@futrob/ui";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  ClockCountdownIcon,
  LockIcon,
  UsersThreeIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { runAction } from "@/shared/presentation/run-action.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import {
  ConfirmAction,
  ExternalClubDialog,
  InvitationDialog,
  roleLabel,
  RosterRoleEditor,
} from "./competition-team-actions.tsx";

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
  readonly hasMoreTeams?: boolean;
  readonly loadingMoreTeams?: boolean;
  readonly busy?: boolean;
  readonly error?: SupportError | null;
  readonly capabilities: TeamConsoleCapabilities;
  readonly invitationUrl?: string | null;
  readonly onSelectTeam: (teamId: string | null) => void;
  readonly onLoadMoreTeams?: () => Promise<void>;
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

export function CompetitionTeamsView(props: CompetitionTeamsViewProps) {
  return (
    <main
      className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground"
      data-shell-bleed=""
    >
      <header className="flex shrink-0 flex-col gap-2 border-b border-border px-5 py-5 sm:px-8">
        <h1 className="typo-heading">Equipos y plantillas</h1>
        <p className="typo-subtitle max-w-[65ch] text-pretty text-muted-foreground">
          Inscripciones, plantillas y clubes EA.
        </p>
      </header>
      {props.error || props.capabilities.unavailable ? (
        <div className="grid shrink-0 gap-3 px-5 py-5 sm:px-8">
          {props.error ? <SupportErrorAlert error={props.error} /> : null}
          {props.capabilities.unavailable ? (
            <Alert variant="warning">
              <span
                aria-hidden="true"
                className="flex h-6 w-4 shrink-0 items-center justify-center text-warning"
              >
                <LockIcon className="size-4" />
              </span>
              <AlertTitle className="text-base font-normal leading-6">
                Permisos no confirmados
              </AlertTitle>
              <AlertDescription className="text-sm font-normal">
                No se pudieron confirmar. Las acciones están deshabilitadas.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
      <MasterDetail
        detail={<TeamDetail {...props} />}
        master={<TeamList {...props} />}
        selectedId={props.selectedTeamId}
      />
    </main>
  );
}

function TeamList({
  items,
  loadingList,
  selectedTeamId,
  onSelectTeam,
  hasMoreTeams,
  loadingMoreTeams,
  onLoadMoreTeams,
}: CompetitionTeamsViewProps) {
  if (loadingList) {
    return (
      <div aria-label="Cargando equipos" className="grid gap-3 p-4" role="status">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="min-w-0 p-4">
        <EmptyState className="min-h-72 min-w-0">
          <EmptyStateIcon>
            <UsersThreeIcon />
          </EmptyStateIcon>
          <EmptyStateTitle>Sin equipos todavía</EmptyStateTitle>
          <EmptyStateDescription>Aparecerán aquí al inscribirse.</EmptyStateDescription>
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="grid gap-3 p-4">
      <nav aria-label="Equipos inscritos" className="grid gap-1">
        {items.map((item) => (
          <button
            aria-current={selectedTeamId === item.team.id ? "true" : undefined}
            className="min-h-16 rounded-lg px-3 py-3 text-start transition-[background-color,color] duration-(--duration-fast) ease-(--ease-standard) hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 aria-current:bg-muted"
            key={item.team.id}
            onClick={() => onSelectTeam(item.team.id)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-1">
                <strong className="block truncate text-sm font-semibold" title={item.team.name}>
                  {item.team.name}
                </strong>
                <span className="typo-caption tabular-nums text-muted-foreground">
                  {item.roster.memberCount}/{item.roster.maxSize} jugadores · {rosterState(item)}
                </span>
              </span>
              <EntryBadge status={item.entry.status} />
            </span>
          </button>
        ))}
      </nav>
      {hasMoreTeams && onLoadMoreTeams ? (
        <Button
          aria-busy={loadingMoreTeams || undefined}
          className="w-full"
          dense
          disabled={loadingMoreTeams}
          onClick={() => runAction(onLoadMoreTeams)}
          variant="outline"
        >
          {loadingMoreTeams ? (
            <CircleNotchIcon
              aria-hidden="true"
              className="size-4 motion-safe:animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          Cargar más equipos
        </Button>
      ) : null}
    </div>
  );
}

function TeamDetail(props: CompetitionTeamsViewProps) {
  if (!props.selectedTeamId) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-5 sm:p-8">
        <EmptyState className="min-h-0 min-w-0 flex-1 border-0">
          <EmptyStateIcon>
            <UsersThreeIcon />
          </EmptyStateIcon>
          <EmptyStateTitle>Selecciona un equipo</EmptyStateTitle>
          <EmptyStateDescription>Verás su inscripción, plantilla y club.</EmptyStateDescription>
        </EmptyState>
      </div>
    );
  }
  if (props.loadingDetail || !props.detail) {
    return (
      <div aria-label="Cargando detalle del equipo" className="grid gap-4 p-5 sm:p-8" role="status">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const { detail, capabilities } = props;
  return (
    <div className="grid gap-8 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          <Button
            className="self-start md:hidden"
            onClick={() => props.onSelectTeam(null)}
            variant="ghost"
          >
            <ArrowLeftIcon aria-hidden="true" /> Volver a equipos
          </Button>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2
                className="truncate text-xl font-bold tracking-tight text-balance"
                title={detail.team.name}
              >
                {detail.team.name}
              </h2>
              <EntryBadge status={detail.entry.status} />
            </div>
            <p className="typo-caption text-muted-foreground">
              {detail.externalClub
                ? `${detail.externalClub.externalClubName} · ${detail.externalClub.platform}`
                : "Sin club EA asociado"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {capabilities.manageInvitations ? (
            <InvitationDialog
              busy={props.busy}
              invitationUrl={props.invitationUrl}
              onCreateInvitation={props.onCreateInvitation}
            />
          ) : null}
          {capabilities.manageExternalClub ? (
            <ExternalClubDialog
              onConnectClub={props.onConnectClub}
              onSearchClubs={props.onSearchClubs}
            />
          ) : null}
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

      <section className="grid gap-3">
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
                <TableEmpty className="typo-caption" colSpan={2}>
                  Sin jugadores.
                </TableEmpty>
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
                      <span
                        className="truncate font-semibold"
                        title={member.presentation.displayName}
                      >
                        {member.presentation.displayName}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    {capabilities.manageRoles ? (
                      <RosterRoleEditor
                        busy={props.busy}
                        displayName={member.presentation.displayName}
                        membershipId={member.membership.id}
                        onChangeRole={props.onChangeRole}
                        role={member.membership.role}
                      />
                    ) : (
                      <span className="font-medium">{roleLabel[member.membership.role]}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {capabilities.manageEntries && detail.entry.status === "pending" ? (
        <section className="flex flex-wrap items-center justify-between gap-6 rounded-lg border border-border p-4">
          <div className="flex min-w-0 max-w-[65ch] flex-col gap-1">
            <h3 className="text-base font-semibold">Decidir inscripción</h3>
            <p className="typo-caption text-pretty text-muted-foreground">
              Aprueba o rechaza al equipo. No cambia el club EA.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ConfirmAction
              confirmLabel="Rechazar inscripción"
              description="El equipo quedará rechazado en esta competición."
              disabled={props.busy}
              onConfirm={() => props.onDecideEntry("reject")}
              triggerLabel="Rechazar"
              variant="destructive"
            />
            <ConfirmAction
              confirmLabel="Aprobar inscripción"
              description="El equipo podrá participar si cumple el resto de reglas."
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
