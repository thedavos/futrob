import { useNavigate } from "@tanstack/react-router";
import { Button } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { ShellCommand } from "@/shared/presentation/shell/shell-commands.ts";

export function ShellCommandButtons({
  commands,
  onAddClub,
}: {
  readonly commands: readonly ShellCommand[];
  readonly onAddClub: () => void;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();

  function run(command: ShellCommand) {
    if (command.disabled) return;
    if (command.id === "accept-invite") {
      void navigate({ to: "/invitations/accept" });
      return;
    }
    if (command.id === "associate-club") onAddClub();
  }

  return commands.map((command, index) => (
    <Button
      dense
      disabled={command.disabled}
      key={command.id}
      onClick={() => run(command)}
      variant={command.variant ?? (index === 0 ? "default" : "outline")}
    >
      {command.id === "associate-club" ? t("shell.workspace.addClub") : command.label}
    </Button>
  ));
}
