import type { Meta, StoryObj } from "@storybook/react-vite";

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

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Editar partido</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar marcador</DialogTitle>
          <DialogDescription>Revisa el resultado antes de enviarlo a auditoría.</DialogDescription>
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
  ),
};
