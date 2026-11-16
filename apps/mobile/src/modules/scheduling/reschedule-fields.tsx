import { useRef } from "react";
import { Pressable, View } from "react-native";
import { randomUUID } from "expo-crypto";
import {
  competitionWallTimeInstant,
  parseCompetitionWallTime,
  type WallTimeFields,
} from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { theme } from "@/theme/theme";
import { Icon, Input, Text } from "@/ui";
import { formatCompetitionInstant, type RescheduleCopy } from "./reschedule-copy";

export interface Choice<Value extends string> {
  readonly value: Value;
  readonly label: string;
  /** Second line: the current kickoff, or why the option is blocked. */
  readonly description?: string;
  readonly disabled?: boolean;
}

/**
 * Single choice as a radio group (web's `ChoiceGroup`). Selection shows a check and is announced
 * as checked, never by color alone; every option is at least 44 dp tall.
 */
export function ChoiceGroup<Value extends string>({
  label,
  choices,
  value,
  onChange,
  disabled = false,
  error,
}: {
  readonly label: string;
  readonly choices: readonly Choice<Value>[];
  readonly value: Value | "";
  readonly onChange: (value: Value) => void;
  readonly disabled?: boolean;
  readonly error?: string | null;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ gap: theme.spacing[2] }}
    >
      <Text role="label">{label}</Text>
      {choices.map((choice) => {
        const checked = choice.value === value;
        const inactive = disabled || choice.disabled === true;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityLabel={choice.label}
            accessibilityHint={choice.description}
            accessibilityState={{ checked, disabled: inactive }}
            disabled={inactive}
            onPress={() => onChange(choice.value)}
            style={{
              minHeight: theme.controlHeight,
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing[3],
              paddingHorizontal: theme.spacing[3],
              paddingVertical: theme.spacing[2],
              borderRadius: theme.corner.md,
              borderWidth: 1,
              borderColor: checked ? theme.colors.primary : theme.colors.border,
              backgroundColor: checked ? theme.colors.muted : "transparent",
              opacity: inactive && !checked ? 0.6 : 1,
            }}
          >
            <View style={{ flex: 1, gap: theme.spacing[1] }}>
              <Text
                style={{
                  fontFamily: checked ? theme.fontFamily.semibold : theme.fontFamily.medium,
                }}
              >
                {choice.label}
              </Text>
              {choice.description ? (
                <Text role="caption" color="muted-foreground">
                  {choice.description}
                </Text>
              ) : null}
            </View>
            {checked ? <Icon name="check" size={18} color="foreground" /> : null}
          </Pressable>
        );
      })}
      {error ? (
        <Text role="caption" color="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A wall time on the competition's clock, as web's date field: the zone is named and the preview
 * shows the instant the server will store. There is no native picker dependency in the app, so
 * date and time are typed fields with their format as the hint.
 */
export function WallTimeField({
  copy,
  language,
  value,
  onChange,
  timeZone,
  error,
  disabled,
}: {
  readonly copy: RescheduleCopy;
  readonly language: MobileLanguage;
  readonly value: WallTimeFields;
  readonly onChange: (value: WallTimeFields) => void;
  readonly timeZone: string;
  readonly error: string | null;
  readonly disabled: boolean;
}) {
  const instant = wallTimeInstant(value, timeZone);
  return (
    <View style={{ gap: theme.spacing[3] }}>
      <Text role="label">{copy.newStart}</Text>
      <Text role="caption" color="muted-foreground">
        {copy.zone(timeZone)}
      </Text>
      <View style={{ flexDirection: "row", gap: theme.spacing[3] }}>
        <View style={{ flex: 3 }}>
          <Input
            label={copy.date}
            hint={copy.dateHint}
            placeholder={copy.dateHint}
            value={value.date}
            onChangeText={(date) => onChange({ ...value, date })}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Input
            label={copy.time}
            hint={copy.timeHint}
            placeholder="21:30"
            value={value.time}
            onChangeText={(time) => onChange({ ...value, time })}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />
        </View>
      </View>
      {error ? (
        <Text role="caption" color="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : instant ? (
        <Text role="caption" color="muted-foreground" accessibilityLiveRegion="polite">
          {copy.preview(formatCompetitionInstant(instant, timeZone, language))}
        </Text>
      ) : null}
    </View>
  );
}

/** The stored instant for the typed fields, or `null` when they do not name one. */
export function wallTimeInstant(value: WallTimeFields, timeZone: string): string | null {
  const wallTime = parseCompetitionWallTime(value);
  return wallTime ? competitionWallTimeInstant(wallTime, timeZone) : null;
}

/** One key per payload, so a retry of the same command replays instead of applying twice. */
export function useCommandKey<Payload>(): (payload: Payload) => string {
  const last = useRef<{ fingerprint: string; key: string } | null>(null);
  return (payload) => {
    const fingerprint = JSON.stringify(payload);
    if (last.current?.fingerprint !== fingerprint) {
      last.current = { fingerprint, key: randomUUID() };
    }
    return last.current.key;
  };
}

/** A multiline text field with the shared Input look. */
export function ReasonField({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string | null;
  readonly disabled: boolean;
}) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChange}
      editable={!disabled}
      multiline
      maxLength={500}
      textAlignVertical="top"
      error={error ?? null}
      style={{ minHeight: theme.controlHeight * 2 }}
    />
  );
}
