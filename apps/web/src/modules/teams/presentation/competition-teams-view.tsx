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
    <div className="grid gap-3 p-3">
      <nav aria-label="Equipos inscritos" className="grid gap-1">
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
      {hasMoreTeams && onLoadMoreTeams ? (
        <Button
          className="w-full"
          disabled={loadingMoreTeams}
          onClick={() => runAction(onLoadMoreTeams)}
          variant="outline"
        >
          {loadingMoreTeams ? "Cargando…" : "Cargar más equipos"}
        </Button>
      ) : null}
    </div>
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
                    <RosterRoleEditor
                      busy={props.busy}
                      displayName={member.presentation.displayName}
                      membershipId={member.membership.id}
                      onChangeRole={props.onChangeRole}
                      role={member.membership.role}
                    />
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
