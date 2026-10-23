import { CORNER_TOKENS, TYPOGRAPHY_TOKENS, themeToHexColors } from "@futrob/ui-tokens";
import type { TokenValue } from "@futrob/ui-tokens";
import { create } from "storybook/theming";

/** Grafito + Lima resolved to hex: Storybook's manager theme does not read CSS variables. */
export const palette = themeToHexColors();

function rawToken(token: TokenValue | undefined): string {
  if (token?.kind !== "raw") throw new Error("Expected a raw design token");
  return token.value;
}

/** Storybook expects corner radii in px; tokens are authored in rem. */
function cornerPx(name: string): number {
  return Number.parseFloat(rawToken(CORNER_TOKENS[name])) * 16;
}

const brandTitle = `<span style="display:inline-flex;align-items:center;gap:10px;font-size:17px;font-weight:700;letter-spacing:0.025em;color:${palette.foreground}"><img src="./brand/logo.svg" alt="" width="20" height="23" style="display:block" />Futrob</span>`;

export const futrobTheme = create({
  base: "dark",

  brandTitle,
  brandUrl: "./",
  brandTarget: "_self",

  colorPrimary: palette.primary,
  colorSecondary: palette.primary,

  appBg: palette.sidebar,
  appContentBg: palette.background,
  appPreviewBg: palette.background,
  appHoverBg: palette["surface-raised"],
  appBorderColor: palette.border,
  appBorderRadius: cornerPx("corner-md"),

  fontBase: rawToken(TYPOGRAPHY_TOKENS["font-ui"]),
  fontCode: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',

  textColor: palette.foreground,
  textInverseColor: palette["primary-foreground"],
  textMutedColor: palette["muted-foreground"],

  barTextColor: palette["muted-foreground"],
  barHoverColor: palette["primary-hover"],
  barSelectedColor: palette.primary,
  barBg: palette.surface,

  buttonBg: palette["surface-raised"],
  buttonBorder: palette.border,
  booleanBg: palette.muted,
  booleanSelectedBg: palette["surface-raised"],

  inputBg: palette.surface,
  inputBorder: palette.border,
  inputTextColor: palette.foreground,
  inputBorderRadius: cornerPx("corner-sm"),
});
