"use client";

import { Link } from "@tanstack/react-router";
import type { CompetitionDraftDto } from "@futrob/api-contracts";
import { Alert, AlertDescription, Badge, Button, Card, CardContent, Logo } from "@futrob/ui";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import { CalendarDays, CircleAlert, ListChecks, RadioTower, type LucideIcon } from "lucide-react";
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
    <main className="min-h-svh bg-background px-5 py-8 text-foreground sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-10 flex items-center gap-2.5">
          <Logo className="h-8 w-auto" />
          <span className="font-semibold tracking-wide">Futrob</span>
        </header>

        {failed ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>
              No pudimos cargar el borrador de la competición. Inténtalo nuevamente.
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
                  ["Plataforma", platformLabel(draft.competition.platform)],
                  ["Región", regionLabel(draft.competition.region)],
                  ["Zona horaria", draft.competition.timeZone],
                  ["Formato", formatLabel(draft.competition.format)],
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
                <SetupTask icon={CalendarDays} label="Configurar calendario" />
                <SetupTask icon={RadioTower} label="Preparar publicación" />
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

function SetupTask({ icon: Icon, label }: { readonly icon: LucideIcon; readonly label: string }) {
  return (
    <div className="flex min-h-16 items-center gap-4 py-4">
      <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
      <span className="flex-1 font-semibold">{label}</span>
      <Badge variant="neutral">Pendiente</Badge>
    </div>
  );
}

function platformLabel(value: CompetitionDraftDto["competition"]["platform"]): string {
  return {
    [GAME_PLATFORM.PLAYSTATION]: "PlayStation",
    [GAME_PLATFORM.XBOX]: "Xbox",
    [GAME_PLATFORM.PC]: "PC",
    [GAME_PLATFORM.NINTENDO_SWITCH_1]: "Nintendo Switch 1",
    [GAME_PLATFORM.NINTENDO_SWITCH_2]: "Nintendo Switch 2",
  }[value];
}

function regionLabel(value: CompetitionDraftDto["competition"]["region"]): string {
  return {
    america: "América",
    "south-america": "Sudamérica",
    "north-central-america": "Norte y Centroamérica",
    europe: "Europa",
    africa: "África",
    asia: "Asia",
    "middle-east": "Medio Oriente",
    oceania: "Oceanía",
  }[value];
}

function formatLabel(value: CompetitionDraftDto["competition"]["format"]): string {
  return {
    league: "Liga",
    knockout: "Eliminación directa",
    "groups-knockout": "Grupos + eliminación",
    "league-playoffs": "Liga + playoffs",
  }[value];
}
