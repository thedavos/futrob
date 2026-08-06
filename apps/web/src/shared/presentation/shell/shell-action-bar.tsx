import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ShellAction = {
  readonly id: string;
  readonly node: ReactNode;
};

type ShellActionBarContextValue = {
  readonly actions: readonly ShellAction[];
  readonly setActions: (actions: readonly ShellAction[]) => void;
  readonly clearActions: () => void;
};

const ShellActionBarContext = createContext<ShellActionBarContextValue | null>(null);

export function ShellActionBarProvider({ children }: { readonly children: ReactNode }) {
  const [actions, setActionsState] = useState<readonly ShellAction[]>([]);

  const setActions = useCallback((next: readonly ShellAction[]) => {
    setActionsState(next);
  }, []);

  const clearActions = useCallback(() => {
    setActionsState([]);
  }, []);

  const value = useMemo(
    () => ({ actions, setActions, clearActions }),
    [actions, setActions, clearActions],
  );

  return <ShellActionBarContext.Provider value={value}>{children}</ShellActionBarContext.Provider>;
}

export function useShellActionBar(): ShellActionBarContextValue {
  const value = useContext(ShellActionBarContext);
  if (!value) {
    throw new Error("useShellActionBar must be used within ShellActionBarProvider");
  }
  return value;
}

export function useOptionalShellActionBar(): ShellActionBarContextValue | null {
  return useContext(ShellActionBarContext);
}
