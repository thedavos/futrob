import { ChoiceGroupIndicator, ChoiceGroupItem } from "@futrob/ui";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";

export function PlatformChoice({
  label,
  value,
}: {
  readonly label: string;
  readonly value: GamePlatformDto;
}) {
  return (
    <ChoiceGroupItem value={value}>
      <ChoiceGroupIndicator />
      <PlatformLogo className="size-8" platform={value} />
      <span className="font-semibold">{label}</span>
    </ChoiceGroupItem>
  );
}
