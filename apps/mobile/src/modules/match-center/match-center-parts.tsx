import { View } from "react-native";
import type { EncounterViewDto } from "@futrob/api-contracts";
import type { ScoreOutcome } from "@futrob/sdk";
import { theme } from "@/theme/theme";
import { Text } from "@/ui";
import type { MatchCenterCopy } from "./match-center-copy";

export function SectionHeading({
  title,
  description,
}: {
  readonly title: string;
  readonly description?: string;
}) {
  return (
    <View style={{ gap: theme.spacing[1] }}>
      <Text role="title" accessibilityRole="header">
        {title}
      </Text>
      {description ? (
        <Text role="caption" color="muted-foreground">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function outcomeText(
  outcome: ScoreOutcome,
  view: EncounterViewDto,
  copy: MatchCenterCopy,
): string {
  if (outcome === "draw") return copy.draw;
  return copy.win(view[outcome].name);
}
