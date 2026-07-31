"use client";

import { useId } from "react";
import {
  Badge,
  Card,
  CardContent,
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Separator,
  type StepperStep,
} from "@futrob/ui";
import { Gamepad2, Monitor, TicketCheck, Trophy, UserRound, UsersRound } from "lucide-react";
import type { OnboardingPathDto } from "@futrob/api-contracts";
import { OnboardingActions } from "./onboarding-actions.tsx";
import { useOnboardingFlow } from "./onboarding-flow.tsx";
import { OnboardingHint } from "./onboarding-hint.tsx";
import { OnboardingShell } from "./onboarding-shell.tsx";

const intentionSteps: readonly StepperStep[] = [
  { id: "intention", label: "Intención" },
  { id: "configure", label: "Configurar" },
  { id: "review", label: "Confirmar" },
];

const stepsByPath: Record<OnboardingPathDto, readonly StepperStep[]> = {
  organization: [
    { id: "intention", label: "Intención" },
    { id: "game", label: "Juego" },
    { id: "review", label: "Confirmar" },
  ],
  invitation: [
    { id: "intention", label: "Intención" },
    { id: "invitation", label: "Invitación" },
    { id: "review", label: "Confirmar" },
  ],
  player: [
    { id: "intention", label: "Intención" },
    { id: "game", label: "Juego" },
    { id: "game-account", label: "Cuenta" },
    { id: "review", label: "Confirmar" },
  ],
};

export function IntentChoiceStep() {
  const flow = useOnboardingFlow();

  return (
    <OnboardingShell
      currentStepId="intention"
      description="Esto nos ayuda a preparar Futrob para lo que quieres hacer primero. Podrás cambiarlo más adelante."
      error={flow.error}
      steps={flow.path ? stepsByPath[flow.path] : intentionSteps}
      title="¿Qué quieres hacer primero?"
    >
      <ChoiceGroup<OnboardingPathDto | "">
        aria-label="Intención del onboarding"
        className="grid-cols-1 sm:grid-cols-3"
        onValueChange={(value) => {
          if (value) flow.setPath(value);
        }}
        value={flow.path ?? ""}
      >
        <ChoiceGroupItem value="organization">
          <ChoiceGroupIndicator />
          <Trophy aria-hidden="true" className="size-8 text-primary" />
          <span className="font-semibold">Organizar competiciones</span>
          <span className="typo-caption text-muted-foreground">
            Crea ligas o torneos y gestiona sus resultados.
          </span>
        </ChoiceGroupItem>
        <ChoiceGroupItem value="invitation">
          <ChoiceGroupIndicator />
          <TicketCheck aria-hidden="true" className="size-8 text-primary" />
          <span className="font-semibold">Tengo una invitación</span>
          <span className="typo-caption text-muted-foreground">
            Únete con el código que te compartieron.
          </span>
        </ChoiceGroupItem>
        <ChoiceGroupItem value="player">
          <ChoiceGroupIndicator />
          <UserRound aria-hidden="true" className="size-8 text-primary" />
          <span className="font-semibold">Continuar como jugador</span>
          <span className="typo-caption text-muted-foreground">
            Consulta tu espacio personal sin una organización.
          </span>
        </ChoiceGroupItem>
      </ChoiceGroup>
      <OnboardingHint>
        Los roles son contextuales y podrás sumar otros caminos después.
      </OnboardingHint>
      <OnboardingActions
        disabled={!flow.path}
        loading={flow.saving}
        onPrimary={() => {
          if (!flow.path) return;
          const next = flow.path === "invitation" ? "invitation" : "game";
          void flow.goTo(next, flow.path);
        }}
        primaryLabel="Continuar"
      />
    </OnboardingShell>
  );
}

export function GamePreferencesStep() {
  const flow = useOnboardingFlow();
  const editionLabelId = useId();
  const platformLabelId = useId();
  const path = flow.path ?? "player";
  const next = path === "player" ? "game-account" : "review";

  return (
    <OnboardingShell
      currentStepId="game"
      description="Selecciona una edición y plataforma si quieres dejar preparada tu experiencia."
      error={flow.error}
      steps={stepsByPath[path]}
      title="Configura tu juego"
    >
      <div className="space-y-8">
        <fieldset className="m-0 space-y-2 border-0 p-0">
          <legend className="typo-label" id={editionLabelId}>
            Edición del juego
          </legend>
          <ChoiceGroup
            aria-labelledby={editionLabelId}
            className="grid-cols-1 sm:grid-cols-3"
            onValueChange={(value: string) => flow.updateDraft({ gameEdition: value })}
            value={flow.draft.gameEdition ?? ""}
          >
            {["FC 25", "FC 26", "Otra edición"].map((edition) => (
              <ChoiceGroupItem appearance="pill" key={edition} value={edition}>
                <ChoiceGroupIndicator className="static size-5" />
                {edition}
              </ChoiceGroupItem>
            ))}
          </ChoiceGroup>
        </fieldset>
        <fieldset className="m-0 space-y-2 border-0 p-0">
          <legend className="typo-label" id={platformLabelId}>
            Plataforma
          </legend>
          <ChoiceGroup
            aria-labelledby={platformLabelId}
            className="grid-cols-1 sm:grid-cols-3"
            onValueChange={(value: string) => flow.updateDraft({ platform: value })}
            value={flow.draft.platform ?? ""}
          >
            <ChoiceGroupItem value="PlayStation">
              <ChoiceGroupIndicator />
              <Gamepad2 aria-hidden="true" className="size-8 text-primary" />
              <span className="font-semibold">PlayStation</span>
            </ChoiceGroupItem>
            <ChoiceGroupItem value="Xbox">
              <ChoiceGroupIndicator />
              <Gamepad2 aria-hidden="true" className="size-8 text-primary" />
              <span className="font-semibold">Xbox</span>
            </ChoiceGroupItem>
            <ChoiceGroupItem value="PC">
              <ChoiceGroupIndicator />
              <Monitor aria-hidden="true" className="size-8 text-primary" />
              <span className="font-semibold">PC</span>
            </ChoiceGroupItem>
          </ChoiceGroup>
          <p className="typo-caption leading-relaxed text-muted-foreground">
            Estas preferencias todavía no se guardan en tu perfil.
          </p>
        </fieldset>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("intention", path)}
        onPrimary={() => void flow.goTo(next, path)}
        onSkip={() => void flow.goTo(next, path)}
        primaryLabel="Continuar"
      />
    </OnboardingShell>
  );
}

export function InvitationStep() {
  const flow = useOnboardingFlow();

  return (
    <OnboardingShell
      currentStepId="invitation"
      description="Puedes indicar tu invitación ahora o hacerlo después desde tu espacio personal."
      error={flow.error}
      steps={stepsByPath.invitation}
      title="Prepara tu invitación"
    >
      <div className="mx-auto w-full max-w-xl">
        <Field>
          <FieldLabel>Código de invitación</FieldLabel>
          <Input
            autoComplete="off"
            onChange={(event) => flow.updateDraft({ invitationToken: event.target.value })}
            placeholder="Pega el código que recibiste"
            value={flow.draft.invitationToken}
          />
          <FieldDescription>
            Por seguridad, este código no forma parte del progreso guardado.
          </FieldDescription>
        </Field>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("intention", "invitation")}
        onPrimary={() => void flow.goTo("review", "invitation")}
        onSkip={() => void flow.goTo("review", "invitation")}
        primaryLabel="Continuar"
      />
    </OnboardingShell>
  );
}

export function GameAccountStep() {
  const flow = useOnboardingFlow();

  return (
    <OnboardingShell
      currentStepId="game-account"
      description="Añade tu identificador de jugador sin compartir credenciales de EA."
      error={flow.error}
      steps={stepsByPath.player}
      title="Vincula tu cuenta de juego"
    >
      <div className="mx-auto w-full max-w-xl">
        <Field>
          <FieldLabel>Identificador de jugador</FieldLabel>
          <Input
            autoComplete="off"
            onChange={(event) => flow.updateDraft({ gameAccountIdentifier: event.target.value })}
            placeholder="ej. gamer23"
            value={flow.draft.gameAccountIdentifier}
          />
          <FieldDescription>
            Este valor no se guardará hasta que vincules tu cuenta desde el dashboard.
          </FieldDescription>
        </Field>
      </div>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => void flow.goTo("game", "player")}
        onPrimary={() => void flow.goTo("review", "player")}
        onSkip={() => void flow.goTo("review", "player")}
        primaryLabel="Continuar"
      />
    </OnboardingShell>
  );
}

export function OnboardingReview() {
  const flow = useOnboardingFlow();
  const path = flow.path ?? "player";
  const rows = reviewRows(flow);

  return (
    <OnboardingShell
      currentStepId="review"
      description="Revisa tu configuración. Los datos pendientes podrán completarse desde tu espacio."
      error={flow.error}
      steps={stepsByPath[path]}
      title="Confirma tu configuración"
    >
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="p-0">
          <dl>
            {rows.map((row, index) => (
              <div key={row.label}>
                {index > 0 ? <Separator /> : null}
                <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                  <dt className="flex items-center gap-3 font-semibold">
                    <row.icon aria-hidden="true" className="size-5 text-primary" />
                    {row.label}
                  </dt>
                  <dd className="flex items-center gap-2 text-right">
                    {row.value ? (
                      <span>{row.value}</span>
                    ) : (
                      <Badge variant="neutral">Pendiente</Badge>
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <OnboardingActions
        loading={flow.saving}
        onBack={() => {
          const previous =
            path === "invitation" ? "invitation" : path === "player" ? "game-account" : "game";
          void flow.goTo(previous, path);
        }}
        onPrimary={() => void flow.finish()}
        primaryLabel="Finalizar"
      />
    </OnboardingShell>
  );
}

function reviewRows(flow: ReturnType<typeof useOnboardingFlow>) {
  const intention = {
    organization: "Organizar competiciones",
    invitation: "Tengo una invitación",
    player: "Continuar como jugador",
  }[flow.path ?? "player"];

  if (flow.path === "invitation") {
    return [
      { label: "Intención", value: intention, icon: Trophy },
      {
        label: "Invitación",
        value: flow.draft.invitationToken ? "Código preparado" : null,
        icon: TicketCheck,
      },
    ];
  }

  const base = [
    { label: "Intención", value: intention, icon: Trophy },
    { label: "Juego", value: flow.draft.gameEdition, icon: Gamepad2 },
    { label: "Plataforma", value: flow.draft.platform, icon: Monitor },
  ];

  return flow.path === "player"
    ? [
        ...base,
        {
          label: "Cuenta de juego",
          value: flow.draft.gameAccountIdentifier || null,
          icon: UserRound,
        },
      ]
    : [...base, { label: "Organización", value: null, icon: UsersRound }];
}
