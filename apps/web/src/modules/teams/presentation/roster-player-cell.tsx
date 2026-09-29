import { applyStyles, Avatar, AvatarFallback, AvatarImage } from "@futrob/ui";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { styles } from "./roster-player-cell.styles.ts";

const avatar = applyStyles(styles.avatar);

/** Avatar and name of a roster member, shared by every roster table. */
export function RosterPlayerCell({
  displayName,
  avatarUrl,
}: Readonly<{ displayName: string; avatarUrl: string | null }>) {
  return (
    <span {...applyStyles(styles.player)}>
      <Avatar className={avatar.className} style={avatar.style}>
        {avatarUrl ? <AvatarImage alt="" src={avatarUrl} /> : null}
        <AvatarFallback>{initialsFromName(displayName)}</AvatarFallback>
      </Avatar>
      <span title={displayName} {...applyStyles(styles.playerName)}>
        {displayName}
      </span>
    </span>
  );
}
