"use client";

import { useState } from "react";
import { cn } from "@futrob/ui";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";

export function ClubCrestAvatar({
  name,
  imageUrl,
  className,
  fallbackClassName,
  framed = true,
}: {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly className?: string;
  readonly fallbackClassName?: string;
  readonly framed?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-4 shrink-0 text-muted-foreground",
        framed ? "overflow-hidden rounded-full bg-muted" : "bg-transparent",
        className,
      )}
      data-slot="club-crest-avatar"
    >
      {showImage ? (
        <img
          alt=""
          className={cn("size-full object-contain", framed ? undefined : "outline-none")}
          data-slot="club-crest-image"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          src={imageUrl!}
        />
      ) : (
        <span
          className={cn(
            "flex size-full items-center justify-center text-[0.625rem] leading-none font-medium",
            fallbackClassName,
          )}
        >
          {initialsFromName(name)}
        </span>
      )}
    </span>
  );
}
