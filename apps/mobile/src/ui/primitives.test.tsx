import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { Dialog, ErrorState, List, ListItem, LoadingState, Tabs } from "./index";

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderUi(ui: ReactNode) {
  return render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}

afterEach(cleanup);

describe("Tabs", () => {
  it("announces the selected tab and reports a change only for another tab", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderUi(
      <Tabs
        label="Vista de partidos"
        value="recent"
        onChange={onChange}
        items={[
          { id: "recent", label: "Recientes" },
          { id: "all", label: "Todos" },
        ]}
      />,
    );

    expect(screen.getByRole("tablist", { name: "Vista de partidos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Recientes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Todos" })).toHaveAttribute("aria-selected", "false");

    await user.click(screen.getByRole("tab", { name: "Recientes" }));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("tab", { name: "Todos" }));
    expect(onChange).toHaveBeenCalledWith("all");
  });
});

describe("List", () => {
  it("makes pressable rows buttons with their selection, and plain rows text", async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    renderUi(
      <List label="Clubes">
        <ListItem title="Cuervos FC1" selected onPress={onPress} />
        <ListItem title="Solo lectura" description="Sin acción" />
      </List>,
    );

    expect(screen.getByRole("list", { name: "Clubes" })).toBeInTheDocument();
    const row = screen.getByRole("button", { name: "Cuervos FC1" });
    expect(row).toHaveAttribute("aria-selected", "true");
    await user.click(row);
    expect(onPress).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Solo lectura" })).toBeNull();
    expect(screen.getByText("Sin acción")).toBeInTheDocument();
  });
});

describe("Dialog", () => {
  it("renders nothing while closed and closes from its close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { rerender } = renderUi(
      <Dialog open={false} onClose={onClose} title="Cambiar de contexto" closeLabel="Cerrar" />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <SafeAreaProvider initialMetrics={metrics}>
        <Dialog open onClose={onClose} title="Cambiar de contexto" closeLabel="Cerrar">
          <ListItem title="Espacio personal" />
        </Dialog>
      </SafeAreaProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "Cambiar de contexto" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Cambiar de contexto" })).toBeInTheDocument();

    const [closeButton] = screen
      .getAllByRole("button", { name: "Cerrar" })
      .filter((button) => dialog.contains(button));
    await user.click(closeButton!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("states", () => {
  it("announces loading by name and keeps skeletons out of the accessibility tree", () => {
    renderUi(<LoadingState label="Cargando…" rows={2} />);
    const loading = screen.getByRole("progressbar", { name: "Cargando…" });
    expect(loading).toHaveAttribute("aria-busy", "true");
  });

  it("offers retry on a failure, distinct from an empty state", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderUi(<ErrorState title="No pudimos cargar" retryLabel="Reintentar" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No pudimos cargar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
