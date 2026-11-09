import { useState, type RefObject } from "react";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Caption,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./account.styles.ts";

type FeedbackDraft = {
  kind: "problem" | "idea";
  message: string;
  expected: string;
  allowContact: boolean;
  includeContext: boolean;
};

export function FeedbackDialog({
  open,
  onOpenChange,
  pathname,
  returnFocus,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly pathname: string;
  readonly returnFocus?: RefObject<HTMLElement | null>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<FeedbackDraft>({
    kind: "problem",
    message: "",
    expected: "",
    allowContact: false,
    includeContext: false,
  });
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        closeLabel={t("account.close")}
        finalFocus={returnFocus}
        {...applyStyles(styles.dialog)}
      >
        <DialogHeader>
          <DialogTitle>{t("feedback.title")}</DialogTitle>
          <DialogDescription>{t("feedback.description")}</DialogDescription>
        </DialogHeader>
        <form {...applyStyles(styles.stack)} onSubmit={(event) => event.preventDefault()}>
          <Field>
            <FieldLabel htmlFor="feedback-type">{t("feedback.type")}</FieldLabel>
            <Select
              items={[
                { value: "problem", label: t("feedback.problem") },
                { value: "idea", label: t("feedback.idea") },
              ]}
              onValueChange={(value) =>
                setDraft({ ...draft, kind: value === "idea" ? "idea" : "problem" })
              }
              value={draft.kind}
            >
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="problem">{t("feedback.problem")}</SelectItem>
                <SelectItem value="idea">{t("feedback.idea")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="feedback-message">{t("feedback.message")}</FieldLabel>
            <Textarea
              id="feedback-message"
              maxLength={4000}
              onChange={(event) => setDraft({ ...draft, message: event.target.value })}
              placeholder={t("feedback.placeholder")}
              required
              rows={4}
              value={draft.message}
            />
          </Field>
          {draft.kind === "problem" ? (
            <Field>
              <FieldLabel htmlFor="feedback-expected">
                {t("feedback.expected")} · {t("feedback.optional")}
              </FieldLabel>
              <Input
                id="feedback-expected"
                maxLength={1000}
                onChange={(event) => setDraft({ ...draft, expected: event.target.value })}
                value={draft.expected}
              />
            </Field>
          ) : null}
          <label {...applyStyles(styles.choice)}>
            <Checkbox
              checked={draft.allowContact}
              onCheckedChange={(checked) => setDraft({ ...draft, allowContact: checked })}
            />
            {t("feedback.reply")}
          </label>
          <div>
            <label {...applyStyles(styles.choice)}>
              <Checkbox
                aria-describedby="feedback-context-hint"
                checked={draft.includeContext}
                onCheckedChange={(checked) => setDraft({ ...draft, includeContext: checked })}
              />
              {t("feedback.context")}
            </label>
            <Caption id="feedback-context-hint">{t("feedback.contextHint")}</Caption>
            {draft.includeContext ? (
              <Caption as="p" {...applyStyles(styles.path)}>
                {pathname}
              </Caption>
            ) : null}
          </div>
          <Alert variant="info">
            <AlertDescription id="feedback-unavailable">
              {t("feedback.unavailable")}
            </AlertDescription>
          </Alert>
          <DialogFooter {...applyStyles(styles.footer)}>
            <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
              {t("account.close")}
            </Button>
            <Button aria-describedby="feedback-unavailable" disabled type="submit">
              {t("feedback.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
