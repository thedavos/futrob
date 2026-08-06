import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info, List } from "@phosphor-icons/react";

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

const meta = {
  title: "Patterns/Overlays",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const OverlaySet: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-6">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Editar partido</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar marcador</DialogTitle>
              <DialogDescription>
                Revisa el resultado antes de enviarlo a auditoría.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-5">
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
            <List />
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

        <Tooltip>
          <TooltipTrigger
            render={<Button aria-label="Información de auditoría" size="icon" variant="ghost" />}
          >
            <Info />
          </TooltipTrigger>
          <TooltipContent>La auditoría compara el reporte con los datos de EA.</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};
