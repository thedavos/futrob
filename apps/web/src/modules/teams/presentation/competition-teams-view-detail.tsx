"use client";

import {
  applyStyles,
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
  typography,
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
import { styles } from "./competition-teams-view-detail.styles.ts";

const skeletonTitle = applyStyles(styles.skeletonTitle);
const skeletonStats = applyStyles(styles.skeletonStats);
const skeletonTable = applyStyles(styles.skeletonTable);
const back = applyStyles(styles.back);
const avatar = applyStyles(styles.avatar);

export function TeamDetail(props: CompetitionTeamsViewProps) {
  if (!props.selectedTeamId) {
    return (
      <div {...applyStyles(styles.emptyWrap)}>
        <EmptyState className={styles.empty}>
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
      <div aria-label="Cargando detalle del equipo" role="status" {...applyStyles(styles.loading)}>
        <Skeleton className={skeletonTitle.className} style={skeletonTitle.style} />
        <Skeleton className={skeletonStats.className} style={skeletonStats.style} />
        <Skeleton className={skeletonTable.className} style={skeletonTable.style} />
      </div>
    );
  }
  const { detail, capabilities } = props;
  return (
    <div {...applyStyles(styles.detail)}>
      <div {...applyStyles(styles.header)}>
        <div {...applyStyles(styles.identity)}>
          <Button
            className={back.className}
            onClick={() => props.onSelectTeam(null)}
            style={back.style}
            variant="ghost"
          >
            <ArrowLeftIcon aria-hidden="true" /> Volver a equipos
          </Button>
          <div {...applyStyles(styles.titleBlock)}>
            <div {...applyStyles(styles.titleRow)}>
              <h2 title={detail.team.name} {...applyStyles(styles.title)}>
                {detail.team.name}
              </h2>
              <EntryBadge status={detail.entry.status} />
            </div>
            <p {...applyStyles(typography.caption, styles.muted)}>
              {detail.externalClub
                ? `${detail.externalClub.externalClubName} · ${detail.externalClub.platform}`
                : "Sin club EA asociado"}
            </p>
          </div>
        </div>
        <div {...applyStyles(styles.actions)}>
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

      <StatGroup className={styles.stats}>
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

      <section {...applyStyles(styles.roster)}>
        <div {...applyStyles(styles.rosterHeader)}>
          <h3 {...applyStyles(styles.sectionTitle)}>Plantilla</h3>
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
                <TableEmpty className={applyStyles(typography.caption).className} colSpan={2}>
                  Sin jugadores.
                </TableEmpty>
              </TableRow>
            ) : (
              detail.members.map((member) => (
                <TableRow key={member.membership.id}>
                  <TableCell>
                    <span {...applyStyles(styles.player)}>
                      <Avatar className={avatar.className} style={avatar.style}>
                        {member.presentation.avatarUrl ? (
                          <AvatarImage alt="" src={member.presentation.avatarUrl} />
                        ) : null}
                        <AvatarFallback>
                          {initialsFromName(member.presentation.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        title={member.presentation.displayName}
                        {...applyStyles(styles.playerName)}
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
                      <span {...applyStyles(styles.role)}>{roleLabel[member.membership.role]}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {capabilities.manageEntries && detail.entry.status === "pending" ? (
        <section {...applyStyles(styles.decision)}>
          <div {...applyStyles(styles.decisionCopy)}>
            <h3 {...applyStyles(styles.sectionTitle)}>Decidir inscripción</h3>
            <p {...applyStyles(typography.caption, styles.muted)}>
              Aprueba o rechaza al equipo. No cambia el club EA.
            </p>
          </div>
          <div {...applyStyles(styles.actions)}>
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
