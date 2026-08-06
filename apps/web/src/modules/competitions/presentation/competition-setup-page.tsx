"use client";

import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, Badge, Button, Card, CardContent, type Icon } from "@futrob/ui";
import { Broadcast, CalendarDots, ListChecks, WarningCircle } from "@phosphor-icons/react";
import {
  competitionFormatLabel,
  competitionPlatformLabel,
  competitionRegionLabel,
} from "@/modules/competitions/presentation/competition-draft-meta.ts";
import { CreateCompetitionInvitationPanel } from "@/modules/organizations/presentation/create-competition-invitation-panel.tsx";
import { useCompetitionDraftQuery } from "./competition-queries.ts";

export function CompetitionSetupPage({
  organizationId,
  competitionId,
}: Readonly<{ organizationId: string; competitionId: string }>) {
  const draftQuery = useCompetitionDraftQuery(organizationId, competitionId);
  const draft = draftQuery.data ?? null;
  const failed = draftQuery.isError;

  return (
    <main className="px-5 py-8 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        {failed ? (
          <Alert variant="destructive">
            <WarningCircle aria-hidden="true" />
            <AlertDescription>
              No se pudo cargar el borrador de la competición. Inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        ) : draft ? (
          <>
            <div className="mb-8 grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="neutral">Borrador</Badge>
                <span className="typo-caption text-muted-foreground">FC Clubs</span>
              </div>
              <h1 className="typo-heading">{draft.competition.name}</h1>
              <p className="typo-subtitle text-muted-foreground">
                La base de tu competición está lista. Completa la operación antes de publicarla.
              </p>
            </div>

            <Card className="mb-8">
              <CardContent className="grid gap-0 p-0 sm:grid-cols-2">
                {[
                  ["Edición", draft.competition.gameEdition],
                  ["Plataforma", competitionPlatformLabel(draft.competition.platform)],
                  ["Región", competitionRegionLabel(draft.competition.region)],
                  ["Zona horaria", draft.competition.timeZone],
                  ["Formato", competitionFormatLabel(draft.competition.format)],
                  ["Reglas", `Versión ${draft.rules.version}`],
                ].map(([label, value], index) => (
                  <div
                    className={`border-t border-border-subtle px-5 py-4 first:border-t-0 sm:odd:border-r ${index === 1 ? "sm:border-t-0" : ""}`}
                    key={label}
                  >
                    <p className="typo-caption text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <section aria-labelledby="next-steps-title">
              <h2 className="mb-4 text-xl font-semibold" id="next-steps-title">
                Siguientes pasos
              </h2>
              <div className="divide-y divide-border-subtle border-y border-border-subtle">
                <SetupTask icon={ListChecks} label="Revisar reglas" />
                <SetupTask icon={CalendarDots} label="Configurar calendario" />
                <SetupTask icon={Broadcast} label="Preparar publicación" />
              </div>
              <p className="mt-4 typo-caption text-muted-foreground">
                Estas configuraciones se habilitarán en el wizard operativo de la competición.
              </p>
            </section>

            <CreateCompetitionInvitationPanel
              competitionId={competitionId}
              organizationId={organizationId}
            />

            <div className="mt-10">
              <Button
                render={<Link params={{ orgId: organizationId }} to="/orgs/$orgId" />}
                variant="outline"
              >
                Volver a la organización
              </Button>
            </div>
          </>
        ) : (
          <p className="typo-subtitle text-muted-foreground">Cargando competición…</p>
        )}
      </div>
    </main>
  );
}

function SetupTask({ icon: Icon, label }: { readonly icon: Icon; readonly label: string }) {
  return (
    <div className="flex min-h-16 items-center gap-4 py-4">
      <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
      <span className="flex-1 font-semibold">{label}</span>
      <Badge variant="neutral">Pendiente</Badge>
    </div>
  );
}
