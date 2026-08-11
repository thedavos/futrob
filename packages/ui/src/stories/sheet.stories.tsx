import type { Meta, StoryObj } from "@storybook/react-vite";
import { ListIcon } from "@phosphor-icons/react";

import { Button } from "../components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/sheet";

const meta = {
  title: "Primitives/Sheet",
  component: Sheet,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button aria-label="Abrir navegación" size="icon" variant="outline" />}>
        <ListIcon />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Navegación</SheetTitle>
          <SheetDescription>Áreas de la competición activa.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <nav className="grid gap-1 text-sm">
            <a className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted" href="#">
              Resumen
            </a>
            <a className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted" href="#">
              Partidos
            </a>
            <a className="rounded-lg px-3 py-2.5 font-medium hover:bg-muted" href="#">
              Estadísticas
            </a>
          </nav>
        </SheetBody>
        <SheetFooter>
          <Button className="w-full">Ir al panel</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(["left", "right", "top", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger render={<Button variant="outline" />}>{side}</SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Lado {side}</SheetTitle>
              <SheetDescription>Panel anclado al borde de la pantalla.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <p className="typo-caption text-muted-foreground">Contenido del sheet {side}.</p>
            </SheetBody>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
};
