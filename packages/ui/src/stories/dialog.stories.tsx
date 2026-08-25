import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyHost } from "@futrob/ui";

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

const styles = stylex.create({
  scores: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.75rem",
    paddingBlock: "1.25rem",
  },
});

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
  ),
};
