import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ActionBar, ActionBarEnd, ActionBarStart } from "../components/action-bar";
import { Button } from "../components/button";
import { MasterDetail } from "../components/master-detail";

const meta = {
  title: "Patterns/Master detail",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ITEMS = [
  { id: "1", title: "Enfrentamiento A vs B" },
  { id: "2", title: "Enfrentamiento C vs D" },
  { id: "3", title: "Enfrentamiento E vs F" },
] as const;

export const SplitPanes: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string | null>("1");
    const selected = ITEMS.find((item) => item.id === selectedId) ?? null;

    return (
      <div className="flex h-svh flex-col">
        <MasterDetail
          detail={
            selected ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  <h2 className="typo-heading text-xl">{selected.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Detalle operativo. Scroll independiente del listado.
                  </p>
                </div>
                <ActionBar>
                  <ActionBarStart>
                    <Button dense onClick={() => setSelectedId(null)} variant="ghost">
                      Volver al listado
                    </Button>
                  </ActionBarStart>
                  <ActionBarEnd>
                    <Button dense disabled>
                      Confirmar
                    </Button>
                  </ActionBarEnd>
                </ActionBar>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-5 text-sm text-muted-foreground">
                Selecciona un enfrentamiento
              </div>
            )
          }
          master={
            <ul className="divide-y divide-border">
              {ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-muted/70 ${
                      item.id === selectedId ? "bg-muted font-medium" : ""
                    }`}
                    onClick={() => setSelectedId(item.id)}
                    type="button"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          }
          selectedId={selectedId}
        />
      </div>
    );
  },
};
