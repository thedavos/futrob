import type { Meta, StoryObj } from "@storybook/react-vite";
import { InfoIcon, ListIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyHost } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/alert-dialog";
import { Button } from "../components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/dialog";
import { Input } from "../components/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "../components/popover";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/tooltip";

const styles = stylex.create({
  panel: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  scores: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.75rem",
    paddingBlock: "1.25rem",
  },
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
});

const meta = {
  title: "Patterns/Overlays",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverlaySet: Story = {
  render: () => (
    <TooltipProvider>
      <div {...applyHost(undefined, undefined, styles.panel)}>
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Editar partido</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar marcador</DialogTitle>
              <DialogDescription>
                Revisa el resultado antes de enviarlo a auditoría.
              </DialogDescription>
            </DialogHeader>
            <div {...applyHost(undefined, undefined, styles.scores)}>
              <Input aria-label="Goles del equipo local" defaultValue="3" type="number" />
              <Input aria-label="Goles del equipo visitante" defaultValue="1" type="number" />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
              <DialogClose render={<Button />}>Guardar</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" />}>
            Eliminar partido
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este partido?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción elimina la programación y no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel render={<Button variant="ghost" />}>Cancelar</AlertDialogCancel>
              <AlertDialogAction render={<Button variant="destructive" />}>
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>Ver criterio</PopoverTrigger>
          <PopoverContent>
            <PopoverTitle>Resultado aprobado</PopoverTitle>
            <PopoverDescription>
              El marcador fue auditado por el staff y ya alimenta estadísticas oficiales.
            </PopoverDescription>
          </PopoverContent>
        </Popover>

        <Sheet>
          <SheetTrigger
            render={<Button aria-label="Abrir navegación" size="icon" variant="outline" />}
          >
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

        <Tooltip>
          <TooltipTrigger
            render={<Button aria-label="Información de auditoría" size="icon" variant="ghost" />}
          >
            <InfoIcon />
          </TooltipTrigger>
          <TooltipContent>La auditoría compara el reporte con los datos de EA.</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};
