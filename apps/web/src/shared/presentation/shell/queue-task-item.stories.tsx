import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  CheckSquareIcon,
  CircleDashedIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlugsIcon,
  PlusIcon,
  SealWarningIcon,
  SquaresFourIcon,
  UserPlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle, Button, cn } from "@futrob/ui";
import type { ComponentProps, ReactNode } from "react";

import { QueueTaskItem } from "./queue-task-item.tsx";

type StoryArgs = ComponentProps<typeof QueueTaskItem>;

const meta = {
  title: "Product/Shell/QueueTaskItem",
  component: QueueTaskItem,
  parameters: { layout: "padded" },
  args: {
    icon: CheckSquareIcon,
    title: "Confirmar selección",
    subtitle: "Nova FC vs Atlas · J4",
    meta: "14h",
    tone: "default",
    dense: true,
    compact: false,
    active: false,
    disabled: false,
  },
  argTypes: {
    icon: { control: false },
    tone: {
      control: "select",
      options: ["default", "urgent", "waiting", "resolved"],
    },
    href: { control: "text" },
    onClick: { action: "click" },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  decorators: [
    (Story) => (
      <QueuePanel label="Tareas">
        <Story />
      </QueuePanel>
    ),
  ],
};

export const States: Story = {
  name: "States",
  render: () => (
    <div className="flex flex-col gap-6">
      <QueuePanel label="default / active / disabled / resolved">
        <QueueTaskItem
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          active
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquareIcon}
          meta="hecha"
          subtitle="Esta tarea ya no está pendiente"
          title="Confirmar selección"
          tone="resolved"
        />
      </QueuePanel>
      <QueuePanel label="tone">
        <QueueTaskItem
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="default"
          tone="default"
        />
        <QueueTaskItem
          icon={WarningCircleIcon}
          meta="urg"
          subtitle="Nova FC vs Atlas · J4"
          title="urgent"
          tone="urgent"
        />
        <QueueTaskItem
          icon={CircleDashedIcon}
          meta="18h"
          subtitle="Nova FC vs Atlas · J4"
          title="waiting"
          tone="waiting"
        />
        <QueueTaskItem
          disabled
          icon={CheckSquareIcon}
          meta="hecha"
          subtitle="Nova FC vs Atlas · J4"
          title="resolved"
          tone="resolved"
        />
      </QueuePanel>
    </div>
  ),
};

export const Density: Story = {
  name: "Density",
  render: () => (
    <div className="flex flex-wrap gap-6">
      <QueuePanel label="dense (default shell)">
        <QueueTaskItem
          dense
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
      </QueuePanel>
      <QueuePanel label="default control height">
        <QueueTaskItem
          dense={false}
          icon={CheckSquareIcon}
          meta="14h"
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
      </QueuePanel>
      <QueuePanel label="compact / icon rail" rail>
        <QueueTaskItem
          compact
          icon={CheckSquareIcon}
          subtitle="Nova FC vs Atlas · J4"
          title="Confirmar selección"
        />
        <QueueTaskItem
          compact
          icon={ArrowsClockwiseIcon}
          subtitle="Titans vs Orion · P1"
          title="Responder reprogramación"
        />
        <QueueTaskItem
          compact
          icon={WarningCircleIcon}
          subtitle="Nova FC vs Atlas · J4"
          title="Resolver desacuerdo"
          tone="urgent"
        />
      </QueuePanel>
    </div>
  ),
};

export const AsLink: Story = {
  name: "As link",
  args: {
    href: "/orgs/org_1/competitions/cmp_1/encounters/enc_1/selection",
    title: "Confirmar selección",
    subtitle: "Nova FC vs Atlas · J4",
    meta: "14h",
    icon: CheckSquareIcon,
  },
  decorators: [
    (Story) => (
      <QueuePanel label="Tareas">
        <Story />
      </QueuePanel>
    ),
  ],
};

export const PersonalContext: Story = {
  name: "Context / Personal",
  render: () => (
    <QueuePanel label="Espacio personal">
      <QueueTaskItem
        icon={EnvelopeSimpleIcon}
        meta="3d"
        subtitle="Liga Nocturna · Nova FC"
        title="Aceptar invitación"
      />
      <QueueTaskItem
        icon={PlugsIcon}
        meta="·"
        subtitle="EA Sports FC · Clubs"
        title="Vincular cuenta de juego"
      />
      <QueueTaskItem
        icon={PencilSimpleIcon}
        meta="·"
        subtitle="Falta nombre público"
        title="Completar perfil de jugador"
      />
    </QueuePanel>
  ),
};

export const OrganizationContext: Story = {
  name: "Context / Organization",
  render: () => (
    <QueuePanel label="Organización">
      <QueueTaskItem
        icon={PlusIcon}
        meta="·"
        subtitle="Copa Primavera"
        title="Completar competición borrador"
      />
      <QueueTaskItem
        icon={UserPlusIcon}
        meta="2d"
        subtitle="marco@ejemplo.com · staff"
        title="Aprobar membresía"
      />
      <QueueTaskItem
        icon={EnvelopeSimpleIcon}
        meta="·"
        subtitle="3 pendientes de aceptación"
        title="Revisar invitaciones enviadas"
      />
    </QueuePanel>
  ),
};

export const CaptainContext: Story = {
  name: "Context / Competition captain",
  render: () => (
    <QueuePanel label="Competición · capitán">
      <QueueTaskItem
        icon={SquaresFourIcon}
        meta="·"
        subtitle="Nova FC vs Atlas · J4"
        title="Elegir partidos oficiales"
      />
      <QueueTaskItem
        icon={CircleDashedIcon}
        meta="18h"
        subtitle="Nova FC vs Atlas · J4"
        title="Esperando confirmación rival"
        tone="waiting"
      />
      <QueueTaskItem
        icon={CheckSquareIcon}
        meta="14h"
        subtitle="Nova FC vs Atlas · J4"
        title="Confirmar selección"
      />
      <QueueTaskItem
        icon={ArrowsLeftRightIcon}
        meta="9h"
        subtitle="Nova FC vs Atlas · J4"
        title="Revisar contrapropuesta"
      />
      <QueueTaskItem
        icon={ArrowsClockwiseIcon}
        meta="6h"
        subtitle="Nova FC vs Atlas · partido 2"
        title="Responder reprogramación"
      />
      <QueueTaskItem
        icon={CircleDashedIcon}
        meta="20h"
        subtitle="Titans vs Orion · encuentro"
        title="Esperando rival (horario)"
        tone="waiting"
      />
      <QueueTaskItem
        icon={WarningCircleIcon}
        meta="·"
        subtitle="Titans vs Orion · J5"
        title="Disputa en revisión"
        tone="urgent"
      />
      <QueueTaskItem
        icon={MagnifyingGlassIcon}
        meta="·"
        subtitle="Nova FC vs Atlas · selección"
        title="Ver decisión del organizador"
      />
      <QueueTaskItem
        icon={SealWarningIcon}
        meta="·"
        subtitle="Plantilla · jugador inelegible"
        title="Revisar sanción"
        tone="urgent"
      />
      <QueueTaskItem
        icon={CircleDashedIcon}
        meta="·"
        subtitle="Club EA · verificación"
        title="Inscripción pendiente de org"
        tone="waiting"
      />
    </QueuePanel>
  ),
};

export const OrganizerContext: Story = {
  name: "Context / Competition organizer",
  render: () => (
    <QueuePanel label="Competición · organizador">
      <QueueTaskItem
        icon={WarningCircleIcon}
        meta="urg"
        subtitle="Nova FC vs Atlas · J4"
        title="Resolver desacuerdo"
        tone="urgent"
      />
      <QueueTaskItem
        icon={WarningCircleIcon}
        meta="urg"
        subtitle="Titans vs Orion · J5"
        title="Revisar disputa"
        tone="urgent"
      />
      <QueueTaskItem
        icon={CheckSquareIcon}
        meta="2d"
        subtitle="Rivals United · club EA"
        title="Aprobar inscripción equipo"
      />
      <QueueTaskItem
        icon={ArrowsClockwiseIcon}
        meta="1d"
        subtitle="Nova FC vs Atlas · P1"
        title="Resolver reprogramación"
      />
      <QueueTaskItem
        icon={PlugsIcon}
        meta="·"
        subtitle="Fallos recientes · Clubs"
        title="Revisar sync EA"
      />
      <QueueTaskItem
        icon={SquaresFourIcon}
        meta="·"
        subtitle="4 enfrentamientos · J3"
        title="Revisar candidatos sin asignar"
      />
      <QueueTaskItem
        icon={SealWarningIcon}
        meta="·"
        subtitle="Orion FC · walkover"
        title="Aplicar sanción"
        tone="urgent"
      />
      <QueueTaskItem
        icon={PencilSimpleIcon}
        meta="·"
        subtitle="Sigue en borrador"
        title="Publicar competición"
      />
    </QueuePanel>
  ),
};

export const Empty: Story = {
  name: "Empty queue",
  render: () => (
    <div className="flex w-72 flex-col gap-4 rounded-2xl border border-border bg-surface p-3">
      <p className="px-2.5 typo-label font-semibold text-muted-foreground">Tareas</p>
      <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-pretty text-foreground">Sin tareas pendientes</p>
          <p className="typo-caption font-medium text-pretty text-muted-foreground">
            Las tareas del espacio activo aparecerán aquí.
          </p>
        </div>
      </div>
    </div>
  ),
};

export const Loading: Story = {
  name: "Loading",
  render: () => (
    <div className="flex w-72 flex-col gap-4 rounded-2xl border border-border bg-surface p-3">
      <p className="px-2.5 typo-label font-semibold text-muted-foreground">Tareas</p>
      <ul
        aria-busy="true"
        aria-label="Cargando tareas"
        className="flex flex-col gap-2"
        role="status"
      >
        <li className="h-10 animate-pulse rounded-lg bg-muted" />
        <li className="h-10 animate-pulse rounded-lg bg-muted" />
        <li className="h-10 animate-pulse rounded-lg bg-muted" />
      </ul>
    </div>
  ),
};

export const ErrorState: Story = {
  name: "Error",
  render: () => (
    <div className="flex w-72 flex-col gap-4 rounded-2xl border border-border bg-surface p-3">
      <p className="px-2.5 typo-label font-semibold text-muted-foreground">Tareas</p>
      <Alert className="gap-y-3" variant="destructive">
        <WarningCircleIcon aria-hidden="true" />
        <AlertTitle className="font-bold">No se pudieron cargar las tareas</AlertTitle>
        <AlertDescription className="grid gap-4">
          <span className="typo-caption font-medium text-pretty">
            Conservamos el espacio activo para que puedas reintentar.
          </span>
          <Button dense type="button" variant="outline">
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  ),
};

function QueuePanel({
  children,
  className,
  label,
  rail = false,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly label: string;
  readonly rail?: boolean;
}) {
  const heading = (
    <p className="typo-label font-semibold text-pretty text-muted-foreground">{label}</p>
  );
  const list = <ul className="flex flex-col gap-2">{children}</ul>;

  if (rail) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {heading}
        <div className="w-fit rounded-2xl border border-border bg-surface p-2">{list}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-72 flex-col gap-4 rounded-2xl border border-border bg-surface p-3",
        className,
      )}
    >
      <p className="px-2.5 typo-label font-semibold text-pretty text-muted-foreground">{label}</p>
      {list}
    </div>
  );
}
