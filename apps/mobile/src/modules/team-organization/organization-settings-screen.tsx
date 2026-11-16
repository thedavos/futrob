import { useState } from "react";
import { View } from "react-native";
import type {
  OrganizationProfileDto,
  UpdateOrganizationProfileRequest,
} from "@futrob/api-contracts";
import { workspaceContextPath } from "@futrob/sdk";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { useMobileCopy } from "@/modules/identity/mobile-copy";
import { StackFrame } from "@/modules/navigation/stack-frame";
import { useContextAccessQuery } from "@/modules/navigation/use-context-access";
import { theme } from "@/theme/theme";
import { Button, EmptyState, ErrorState, Input, LoadingState, Text } from "@/ui";
import { teamOrganizationCopy, type TeamOrganizationCopy } from "./team-organization-copy";
import {
  errorCode,
  isUnauthorized,
  useOrganizationProfile,
  useUpdateOrganizationProfile,
} from "./team-organization-data";
import { LoginRedirect } from "./team-organization-states";

/**
 * Ajustes: the organization's name and public address (web's settings › general). Only who
 * may update the organization edits them; the API authorizes the change again.
 */
export function OrganizationSettingsScreen({ organizationId }: { organizationId: string }) {
  const { language } = useMobileCopy();
  const copy = teamOrganizationCopy(language);
  const access = useContextAccessQuery({ kind: "organization", organizationId });
  const canUpdate = access.data?.has(MOBILE_PERMISSION.organizationsUpdate) === true;
  const profile = useOrganizationProfile(organizationId, canUpdate);

  if (isUnauthorized(access.error) || isUnauthorized(profile.error)) return <LoginRedirect />;

  function body() {
    const failed = access.isError ? access : profile.isError ? profile : null;
    if (failed) {
      return (
        <ErrorState
          title={copy.settings.error}
          description={copy.errorDescription}
          retryLabel={copy.retry}
          retrying={failed.isFetching}
          onRetry={() => void failed.refetch()}
        />
      );
    }
    if (!access.data) return <LoadingState label={copy.settings.loading} />;
    if (!canUpdate) {
      return (
        <EmptyState
          title={copy.settings.forbiddenTitle}
          description={copy.settings.forbiddenDescription}
        />
      );
    }
    if (!profile.data) return <LoadingState label={copy.settings.loading} />;
    return (
      <SettingsForm
        key={organizationId}
        organizationId={organizationId}
        profile={profile.data}
        copy={copy}
      />
    );
  }

  return (
    <StackFrame
      title={copy.settings.title}
      fallbackHref={`${workspaceContextPath({ kind: "organization", organizationId })}/more`}
    >
      <Text color="muted-foreground">{copy.settings.description}</Text>
      {body()}
    </StackFrame>
  );
}

function saveError(code: string | undefined, copy: TeamOrganizationCopy): string {
  if (code === "organizations.name_conflict") return copy.settings.nameTaken;
  if (code === "organizations.slug_conflict") return copy.settings.slugTaken;
  if (code === "organizations.invalid_name" || code === "organizations.invalid_slug") {
    return copy.settings.invalid;
  }
  return copy.settings.saveFailed;
}

function SettingsForm({
  organizationId,
  profile,
  copy,
}: {
  organizationId: string;
  profile: OrganizationProfileDto;
  copy: TeamOrganizationCopy;
}) {
  const save = useUpdateOrganizationProfile(organizationId);
  const [name, setName] = useState(profile.name);
  const [slug, setSlug] = useState(profile.slug);
  const [message, setMessage] = useState<{ text: string; problem: boolean } | null>(null);

  function submit() {
    const next = { name: name.trim(), slug: slug.trim() };
    if (!next.name || !next.slug) {
      setMessage({ text: copy.settings.required, problem: true });
      return;
    }
    const patch: UpdateOrganizationProfileRequest = {};
    if (next.name !== profile.name) patch.name = next.name;
    if (next.slug !== profile.slug) patch.slug = next.slug;
    if (patch.name === undefined && patch.slug === undefined) {
      setMessage({ text: copy.settings.unchanged, problem: false });
      return;
    }
    setMessage(null);
    save.mutate(patch, {
      onError: (error) => {
        if (!isUnauthorized(error)) {
          setMessage({ text: saveError(errorCode(error), copy), problem: true });
        }
      },
    });
  }

  return (
    <View style={{ gap: theme.spacing[4] }}>
      <Input
        label={copy.settings.name}
        value={name}
        onChangeText={setName}
        maxLength={120}
        editable={!save.isPending}
      />
      <View style={{ gap: theme.spacing[1] }}>
        <Input
          label={copy.settings.slug}
          value={slug}
          onChangeText={setSlug}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={100}
          editable={!save.isPending}
        />
        <Text role="caption" color="muted-foreground">
          {copy.settings.slugHint}
        </Text>
      </View>
      {message ? (
        <Text
          role="caption"
          color={message.problem ? "danger" : "muted-foreground"}
          accessibilityRole="alert"
        >
          {message.text}
        </Text>
      ) : save.isSuccess ? (
        <Text role="caption" color="muted-foreground" accessibilityRole="alert">
          {copy.settings.saved}
        </Text>
      ) : null}
      <View style={{ alignItems: "flex-start" }}>
        <Button label={copy.settings.save} loading={save.isPending} onPress={submit} />
      </View>
    </View>
  );
}
