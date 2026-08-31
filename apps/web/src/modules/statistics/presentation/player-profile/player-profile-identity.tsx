import type { PlayerGameProfileDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Avatar, AvatarFallback, Caption, Heading, typography } from "@futrob/ui";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { identityDescription } from "./player-profile-copy.ts";

const styles = stylex.create({
  root: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "1rem",
  },
  avatar: {
    width: "3.5rem",
    height: "3.5rem",
    flexShrink: 0,
  },
  copy: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  name: {
    overflowWrap: "anywhere",
  },
});

export function PlayerProfileIdentity({
  profile,
  t,
}: {
  readonly profile: PlayerGameProfileDto;
  readonly t: Translator;
}) {
  return (
    <section aria-label={t("player.statistics.identity")} {...applyStyles(styles.root)}>
      <Avatar {...applyStyles(styles.avatar)}>
        <AvatarFallback {...applyStyles(typography.label)}>
          {initialsFromName(profile.identity.displayName)}
        </AvatarFallback>
      </Avatar>
      <div {...applyStyles(styles.copy)}>
        <Heading {...applyStyles(styles.name)} truncate>
          {profile.identity.displayName}
        </Heading>
        <Caption>{identityDescription(profile, t)}</Caption>
      </div>
    </section>
  );
}
