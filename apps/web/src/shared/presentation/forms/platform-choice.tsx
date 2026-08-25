import * as stylex from "@stylexjs/stylex";
import { applyStyles, ChoiceGroupIndicator, ChoiceGroupItem } from "@futrob/ui";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { PlatformLogo } from "@/shared/presentation/platform-logo.tsx";

const styles = stylex.create({
  logo: {
    width: "2rem",
    height: "2rem",
  },
  label: {
    fontWeight: 600,
  },
});

export function PlatformChoice({
  label,
  value,
}: {
  readonly label: string;
  readonly value: GamePlatformDto;
}) {
  const logo = applyStyles(styles.logo);
  return (
    <ChoiceGroupItem value={value}>
      <ChoiceGroupIndicator />
      <PlatformLogo className={logo.className} platform={value} style={logo.style} />
      <span {...applyStyles(styles.label)}>{label}</span>
    </ChoiceGroupItem>
  );
}
