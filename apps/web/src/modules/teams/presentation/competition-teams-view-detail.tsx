"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
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
import { ArrowLeftIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import {
  ConfirmAction,
  ExternalClubDialog,
  InvitationDialog,
  roleLabel,
  RosterRoleEditor,
} from "./competition-team-actions.tsx";
import type { CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { EntryBadge, entryStatusLabel } from "./competition-teams-view-entry.tsx";

export function TeamDetail(props: CompetitionTeamsViewProps) {
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
