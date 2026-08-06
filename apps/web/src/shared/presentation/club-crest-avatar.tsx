"use client";

import { useState } from "react";
import { cn } from "@futrob/ui";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";

export function ClubCrestAvatar({
  name,
  imageUrl,
  className,
  fallbackClassName,
}: {
  readonly name: string;
  readonly imageUrl: string | null;
  readonly className?: string;
  readonly fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-4 shrink-0 overflow-hidden rounded-full bg-muted text-muted-foreground",
        className,
      )}
      data-slot="club-crest-avatar"
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-contain"
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
