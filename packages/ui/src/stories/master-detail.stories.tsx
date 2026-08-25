import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyProps, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { ActionBar, ActionBarEnd, ActionBarStart } from "../components/action-bar";
import { Button } from "../components/button";
import { MasterDetail } from "../components/master-detail";

const styles = stylex.create({
  shell: {
    display: "flex",
    height: "100svh",
    flexDirection: "column",
  },
  detail: {
    display: "flex",
    minHeight: 0,
    flex: 1,
    flexDirection: "column",
  },
  detailBody: {
    minHeight: 0,
    flex: 1,
    overflowY: "auto",
    padding: "1.25rem",
  },
  heading: {
    fontSize: "var(--text-xl)",
  },
  muted: {
    marginTop: "0.5rem",
    fontSize: "var(--text-sm)",
    color: colors.mutedForeground,
  },
  empty: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: "1.25rem",
    fontSize: "var(--text-sm)",
    color: colors.mutedForeground,
  },
  list: {
    display: "flex",
    flexDirection: "column",
  },
  item: {
    width: "100%",
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    textAlign: "left",
    fontSize: "var(--text-sm)",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    backgroundColor: {
      default: "transparent",
      ":hover": "color-mix(in oklab, var(--muted) 70%, transparent)",
    },
  },
  itemSelected: {
    backgroundColor: colors.muted,
    fontWeight: 500,
  },
});

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
      <div {...applyProps(undefined, undefined, styles.shell)}>
        <MasterDetail
          detail={
            selected ? (
              <div {...applyProps(undefined, undefined, styles.detail)}>
                <div {...applyProps(undefined, undefined, styles.detailBody)}>
                  <h2 {...applyProps(undefined, undefined, typography.heading, styles.heading)}>
                    {selected.title}
                  </h2>
                  <p {...applyProps(undefined, undefined, styles.muted)}>
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
              <div {...applyProps(undefined, undefined, styles.empty)}>
                Selecciona un enfrentamiento
              </div>
            )
          }
          master={
            <ul {...applyProps(undefined, undefined, styles.list)}>
              {ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setSelectedId(item.id)}
                    type="button"
                    {...applyProps(
                      undefined,
                      undefined,
                      styles.item,
                      item.id === selectedId && styles.itemSelected,
                    )}
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
