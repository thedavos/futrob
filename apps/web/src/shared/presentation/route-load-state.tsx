import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { FailedScreen } from "@/shared/presentation/status-screen.tsx";

/** A route loader that failed: the page-level failure screen, retrying the loader. */
export function RouteLoadError({
  reset,
  title,
  description,
}: ErrorComponentProps & Readonly<{ title: string; description: string }>) {
  const router = useRouter();
  const { t } = useI18n();

  function retry() {
    reset();
    void router.invalidate();
  }

  return (
    <FailedScreen
      description={description}
      onRetry={retry}
      retryLabel={t("common.retry")}
      title={title}
    />
  );
}
