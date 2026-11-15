import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Caption,
  Field,
  FieldLabel,
  Input,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { styles } from "./account.styles.ts";

export type ProfileIdentity = {
  readonly name: string;
  readonly email: string;
  readonly image?: string | null;
};

export function ProfileEditor({
  identity,
  save,
}: {
  readonly identity: ProfileIdentity;
  readonly save: (name: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(identity.name);
  const [savedName, setSavedName] = useState(identity.name);
  const mutation = useMutation({ mutationFn: save, onSuccess: (_, value) => setSavedName(value) });
  return (
    <form
      {...applyStyles(styles.stack)}
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) mutation.mutate(name.trim());
      }}
    >
      <div {...applyStyles(styles.row)}>
        <Avatar {...applyStyles(styles.avatar)}>
          {identity.image ? <AvatarImage alt="" src={identity.image} /> : null}
          <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
        </Avatar>
        <Caption>{t("profile.initialsHint")}</Caption>
      </div>
      <Field>
        <FieldLabel htmlFor="profile-name">{t("profile.name")}</FieldLabel>
        <Input
          autoComplete="nickname"
          disabled={mutation.isPending}
          id="profile-name"
          maxLength={100}
          onChange={(event) => {
            setName(event.target.value);
            mutation.reset();
          }}
          required
          value={name}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="profile-email">{t("profile.email")}</FieldLabel>
        <Input
          aria-describedby="profile-email-hint"
          id="profile-email"
          readOnly
          type="email"
          value={identity.email}
        />
        <Caption id="profile-email-hint">{t("profile.identityHint")}</Caption>
      </Field>
      {mutation.isError ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{t("profile.error")}</AlertDescription>
        </Alert>
      ) : null}
      {mutation.isSuccess ? (
        <p role="status">
          <Caption>{t("profile.saved")}</Caption>
        </p>
      ) : null}
      <div {...applyStyles(styles.actions)}>
        <Button
          aria-busy={mutation.isPending}
          disabled={mutation.isPending || !name.trim() || name.trim() === savedName}
          type="submit"
        >
          {t(mutation.isPending ? "account.saving" : "profile.save")}
        </Button>
      </div>
    </form>
  );
}
