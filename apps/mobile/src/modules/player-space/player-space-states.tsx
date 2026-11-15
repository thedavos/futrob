import { Redirect, useRouter } from "expo-router";
import { nativeRoute } from "@/modules/identity/native-route";
import { LOGIN_ROUTE } from "@/modules/identity/session-gate";
import { Button, EmptyState } from "@/ui";

/** Sends a 401 back to login; the session was already cleared where the read failed. */
export function LoginRedirect() {
  return <Redirect href={LOGIN_ROUTE} />;
}

/** A missing prerequisite names what is missing and links to where it is set up. */
export function PrerequisiteState({
  title,
  description,
  actionLabel,
  href,
}: {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}) {
  const router = useRouter();
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Button
          variant="secondary"
          label={actionLabel}
          onPress={() => router.push(nativeRoute(href))}
        />
      }
    />
  );
}
