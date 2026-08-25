import type { Meta, StoryObj } from "@storybook/react-vite";
import { ListIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

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

const styles = stylex.create({
  nav: {
    display: "grid",
    gap: "0.25rem",
    fontSize: "var(--text-sm)",
  },
  navLink: {
    borderRadius: "var(--corner-lg)",
    paddingInline: "0.75rem",
    paddingBlock: "0.625rem",
    fontWeight: 500,
    backgroundColor: {
      default: null,
      ":hover": colors.muted,
    },
  },
  full: { width: "100%" },
  sides: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  muted: { color: colors.mutedForeground },
});

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
          <nav {...applyHost(undefined, undefined, styles.nav)}>
            <a href="#" {...applyHost(undefined, undefined, styles.navLink)}>
              Resumen
            </a>
            <a href="#" {...applyHost(undefined, undefined, styles.navLink)}>
              Partidos
            </a>
            <a href="#" {...applyHost(undefined, undefined, styles.navLink)}>
              Estadísticas
            </a>
          </nav>
        </SheetBody>
        <SheetFooter>
          <Button {...applyHost(undefined, undefined, styles.full)}>Ir al panel</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const Sides: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.sides)}>
      {(["left", "right", "top", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger render={<Button variant="outline" />}>{side}</SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Lado {side}</SheetTitle>
              <SheetDescription>Panel anclado al borde de la pantalla.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
                Contenido del sheet {side}.
              </p>
            </SheetBody>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
};
