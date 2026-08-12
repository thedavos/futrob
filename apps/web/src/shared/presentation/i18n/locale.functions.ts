import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { LOCALE_COOKIE, resolveLocale } from "./locale.ts";

const localeInput = z.object({ locale: z.enum(["es", "en"]) });

export const getUiLocale = createServerFn({ method: "GET" }).handler(() =>
  resolveLocale(getCookie(LOCALE_COOKIE)),
);

export const setUiLocale = createServerFn({ method: "POST" })
  .validator(localeInput)
  .handler(({ data }) => {
    setCookie(LOCALE_COOKIE, data.locale, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return data.locale;
  });
