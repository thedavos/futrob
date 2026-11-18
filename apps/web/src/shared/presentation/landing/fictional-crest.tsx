import { useId, type ReactNode } from "react";

import type {
  CrestDesign,
  CrestPattern,
  CrestShield,
} from "@/shared/presentation/landing/cup-bracket.model.ts";

/**
 * Crest outlines in a 32×36 box, horizontally centred and vertically centred on y = 18, so the
 * crest sits optically centred in a round slot. None copies a real club (`design.md`, Hero).
 */
const SHIELDS = {
  heater: "M3 2.5H29V16C29 25.5 22.5 31.5 16 34C9.5 31.5 3 25.5 3 16Z",
  iberian: "M3 2.5H29V20A13 13 0 0 1 3 20Z",
  french: "M3 2.5H29V22.5L16 34L3 22.5Z",
  crown: "M3 7L9.5 2.5L16 6L22.5 2.5L29 7V18C29 26 22.5 31.5 16 34C9.5 31.5 3 26 3 18Z",
  roundel: "M16 2.5A15.5 15.5 0 1 1 15.99 2.5Z",
  badge: "M9 2.5H23L29 8.5V27.5L23 33.5H9L3 27.5V8.5Z",
} as const satisfies Readonly<Record<CrestShield, string>>;

function Pattern({ kind, ink }: { readonly kind: CrestPattern; readonly ink: string }): ReactNode {
  switch (kind) {
    case "stripes":
      return [7, 15, 23].map((x) => <rect fill={ink} height={36} key={x} width={3.6} x={x} />);
    case "hoops":
      return [9, 17, 25].map((y) => <rect fill={ink} height={3.6} key={y} width={32} y={y} />);
    case "halves":
      return <rect fill={ink} height={36} width={16} x={16} />;
    case "band":
      return <rect fill={ink} height={8} width={32} y={12} />;
    case "sash":
      return <path d="M-4 8L8 -4L36 24L24 36Z" fill={ink} />;
    case "chevron":
      return <path d="M0 10L16 22L32 10V16L16 28L0 16Z" fill={ink} />;
    case "quarters":
      return (
        <>
          <rect fill={ink} height={18} width={16} x={16} />
          <rect fill={ink} height={18} width={16} y={18} />
        </>
      );
    case "ring":
      return <circle cx={16} cy={18} fill="none" r={10.5} stroke={ink} strokeWidth={2.4} />;
    case "plain":
      return null;
  }
}

/** Decorative: the club's name is always given by the surrounding control or text. */
export function FictionalCrest({
  className,
  crest,
}: {
  readonly className?: string;
  readonly crest: CrestDesign;
}) {
  const clipId = useId();
  const [field, ink] = crest.colors;
  const outline = SHIELDS[crest.shield];
  return (
    <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 32 36">
      <defs>
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect fill={field} height={36} width={32} />
        <Pattern ink={ink} kind={crest.pattern} />
      </g>
      <path d={outline} fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth={1.2} />
      <circle
        cx={16}
        cy={18}
        fill="rgb(0 0 0 / 0.55)"
        r={6.6}
        stroke="rgb(255 255 255 / 0.35)"
        strokeWidth={0.8}
      />
      <text
        dominantBaseline="central"
        fill="#fff"
        fontFamily="inherit"
        fontSize={8.4}
        fontWeight={800}
        textAnchor="middle"
        x={16}
        y={18}
      >
        {crest.letter}
      </text>
    </svg>
  );
}
