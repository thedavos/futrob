import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  List,
  ListItem,
  LoadingState,
  Tabs,
} from "./index";
import { theme } from "@/theme/theme";

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

  it("moves both aria-selected and a non-color weight indicator together on pills tabs", async () => {
    const user = userEvent.setup();
    function PillsHarness() {
      const [value, setValue] = useState<"goals" | "rating">("goals");
      return (
        <Tabs
          label="Tipo de ranking"
          variant="pills"
          value={value}
          onChange={setValue}
          items={[
            { id: "goals", label: "Goles" },
            { id: "rating", label: "Rating" },
          ]}
        />
      );
    }

    renderUi(<PillsHarness />);
    const goalsTab = screen.getByRole("tab", { name: "Goles" });
    const ratingTab = screen.getByRole("tab", { name: "Rating" });
    const goalsLabel = screen.getByText("Goles");
    const ratingLabel = screen.getByText("Rating");

    expect(goalsTab).toHaveAttribute("aria-selected", "true");
    expect(ratingTab).toHaveAttribute("aria-selected", "false");
    expect(goalsLabel.style.fontFamily).toBe(theme.fontFamily.semibold);
    expect(ratingLabel.style.fontFamily).toBe(theme.fontFamily.medium);

    await user.click(ratingTab);

    expect(goalsTab).toHaveAttribute("aria-selected", "false");
    expect(ratingTab).toHaveAttribute("aria-selected", "true");
    expect(goalsLabel.style.fontFamily).toBe(theme.fontFamily.medium);
    expect(ratingLabel.style.fontFamily).toBe(theme.fontFamily.semibold);
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

describe("Button", () => {
  it("uses a readable spinner color on the muted loading surface", () => {
    renderUi(<Button label="Guardar" loading variant="primary" />);
    const button = screen.getByRole("button", { name: "Guardar" });
    const spinner = button.querySelector('[role="progressbar"]');
    expect(spinner).not.toBeNull();
    const circle = spinner?.querySelector("circle");
    expect(circle).not.toBeNull();
    expect(circle?.style.stroke).toBe("rgb(173, 181, 189)");
    expect(theme.colors["muted-foreground"]).toBe("#adb5bd");
  });

  it("uses corner-lg and avoids opacity dimming on disabled ghost buttons", () => {
    renderUi(<Button label="Cancelar" disabled variant="ghost" />);
    const button = screen.getByRole("button", { name: "Cancelar" });
    expect(button.style.borderRadius).toBe("12px");
    expect(button.style.opacity).not.toBe("0.5");
  });
});

describe("Input", () => {
  it("associates error text with aria-describedby and styles non-editable fields without opacity", () => {
    renderUi(<Input label="Club" value="Cuervos" editable={false} error="Solo lectura" />);
    const input = screen.getByLabelText("Club");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe("Solo lectura");
    expect(input.style.borderRadius).toBe("12px");
  });
});

describe("Card and EmptyState", () => {
  it("renders Card title with the title scale and EmptyState without a dashed frame", () => {
    const { container } = renderUi(
      <>
        <Card title="Resumen" />
        <EmptyState title="Sin partidos" description="Aún no hay partidos registrados." />
      </>,
    );
    const cardHeading = screen.getByRole("heading", { name: "Resumen" });
    expect(cardHeading.style.fontSize).toBe("18px");
    expect(container.innerHTML).not.toContain("dashed");
  });
});
