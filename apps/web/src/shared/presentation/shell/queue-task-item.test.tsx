// @vitest-environment jsdom

import { CheckSquareIcon } from "@phosphor-icons/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { QueueTaskItem } from "./queue-task-item.tsx";

describe("QueueTaskItem", () => {
  afterEach(() => {
    cleanup();
  });

  it("collapses to an icon-only control with an accessible name", () => {
    render(
      <QueueTaskItem
        compact
        icon={CheckSquareIcon}
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
    const onClick = vi.fn<() => void>();
    render(<QueueTaskItem icon={CheckSquareIcon} onClick={onClick} title="Confirmar selección" />);

    fireEvent.click(screen.getByRole("button", { name: /Confirmar selección/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a link when href is provided", () => {
    render(
      <QueueTaskItem
        href="/encounters/enc_1/selection"
        icon={CheckSquareIcon}
        title="Confirmar selección"
      />,
    );

    const link = screen.getByRole("link", { name: /Confirmar selección/ });
    expect(link.getAttribute("href")).toBe("/encounters/enc_1/selection");
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn<() => void>();
    render(
      <QueueTaskItem
        disabled
        icon={CheckSquareIcon}
        onClick={onClick}
        title="Confirmar selección"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirmar selección/ }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
