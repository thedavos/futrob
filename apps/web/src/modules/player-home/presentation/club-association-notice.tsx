import { Link } from "@tanstack/react-router";
import { WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Alert, AlertDescription, AlertTitle, applyStyles, Button, TextLink } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

const styles = stylex.create({
  alert: {
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    marginBottom: "1rem",
  },
  icon: {
    width: "1.25rem",
    height: "1.25rem",
    color: "var(--warning)",
  },
  dismiss: {
    gridColumnStart: 3,
    gridRowStart: 1,
    gridRowEnd: 3,
    alignSelf: "start",
    marginBlock: "-0.625rem",
    marginRight: "-0.625rem",
  },
});

const alert = applyStyles(styles.alert);
const icon = applyStyles(styles.icon);
const dismiss = applyStyles(styles.dismiss);

/**
 * Onboarding finished without the club because the provider did not answer. The profile is
 * ready; the player can add the club later from the context selector (see Clubes EA).
 */
export function ClubAssociationNotice({ onDismiss }: { readonly onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <Alert className={alert.className} style={alert.style} variant="warning">
      <WarningCircleIcon aria-hidden="true" className={icon.className} style={icon.style} />
      <AlertTitle>{t("player.home.clubAssociationFailed.title")}</AlertTitle>
      <AlertDescription>
        {t("player.home.clubAssociationFailed.description")}{" "}
        <TextLink render={<Link to="/player/ea-clubs" />}>
          {t("player.home.clubAssociationFailed.action")}
        </TextLink>
      </AlertDescription>
      <Button
        aria-label={t("player.home.clubAssociationFailed.dismiss")}
        className={dismiss.className}
        onClick={onDismiss}
        size="icon"
        style={dismiss.style}
        variant="ghost"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </Alert>
  );
}
