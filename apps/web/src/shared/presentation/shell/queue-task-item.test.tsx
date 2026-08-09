// @vitest-environment jsdom

import { CheckSquare, WarningCircle } from "@phosphor-icons/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { QueueTaskItem } from "./queue-task-item.tsx";

describe("QueueTaskItem", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title, subtitle, meta and decorative icon", () => {
    const { container } = render(
      <QueueTaskItem
        icon={CheckSquare}
        meta="14h"
        subtitle="Nova FC vs Atlas · J4"
        title="Confirmar selección"
      />,
    );

    expect(screen.getByRole("button", { name: /Confirmar selección/ })).toBeTruthy();
    expect(screen.getByText("Confirmar selección")).toBeTruthy();
    expect(screen.getByText("Nova FC vs Atlas · J4")).toBeTruthy();
    expect(screen.getByText("14h")).toBeTruthy();
    expect(container.querySelector('[data-slot="queue-task-item-icon"]')).toBeTruthy();
  });

  it("exposes closed tone variants via data attributes", () => {
    const { rerender, container } = render(
      <QueueTaskItem icon={CheckSquare} title="Tarea" tone="default" />,
    );
    expect(container.querySelector('[data-tone="default"]')).toBeTruthy();

    rerender(<QueueTaskItem icon={WarningCircle} title="Urgente" tone="urgent" />);
    expect(container.querySelector('[data-tone="urgent"]')).toBeTruthy();

    rerender(<QueueTaskItem icon={CheckSquare} title="Espera" tone="waiting" />);
    expect(container.querySelector('[data-tone="waiting"]')).toBeTruthy();

    rerender(<QueueTaskItem disabled icon={CheckSquare} title="Hecha" tone="resolved" />);
    expect(container.querySelector('[data-tone="resolved"]')).toBeTruthy();
  });

  it("marks dense and active states for shell density contracts", () => {
    const { container } = render(<QueueTaskItem active dense icon={CheckSquare} title="Activa" />);

    const trigger = container.querySelector('[data-slot="queue-task-item-trigger"]');
    expect(trigger?.getAttribute("data-density")).toBe("dense");
    expect(trigger?.getAttribute("data-active")).toBe("true");
  });

  it("collapses to an icon-only control with an accessible name", () => {
    render(
      <QueueTaskItem
        compact
        icon={CheckSquare}
        subtitle="Nova FC vs Atlas · J4"
        title="Confirmar selección"
      />,
    );

    const button = screen.getByRole("button", {
      name: "Confirmar selección. Nova FC vs Atlas · J4",
    });
    expect(button).toBeTruthy();
    expect(screen.queryByText("Confirmar selección")).toBeNull();
    expect(screen.queryByText("Nova FC vs Atlas · J4")).toBeNull();
  });

  it("invokes onClick when used as a button", () => {
    const onClick = vi.fn();
    render(<QueueTaskItem icon={CheckSquare} onClick={onClick} title="Confirmar selección" />);

    fireEvent.click(screen.getByRole("button", { name: /Confirmar selección/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a link when href is provided", () => {
    render(
      <QueueTaskItem
        href="/encounters/enc_1/selection"
        icon={CheckSquare}
        title="Confirmar selección"
      />,
    );

    const link = screen.getByRole("link", { name: /Confirmar selección/ });
    expect(link.getAttribute("href")).toBe("/encounters/enc_1/selection");
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <QueueTaskItem disabled icon={CheckSquare} onClick={onClick} title="Confirmar selección" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirmar selección/ }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
