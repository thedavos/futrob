import type { SVGProps } from "react";

type EaLogoProps = SVGProps<SVGSVGElement>;

/** Brand path from Simple Icons (CC0), retained locally to avoid a runtime dependency. */
export function EaLogo(props: EaLogoProps) {
  return (
    <svg
      aria-hidden="true"
      data-ea-logo=""
      fill="currentColor"
      focusable={false}
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M16.635 6.162l-5.928 9.377H4.24l1.508-2.3h4.024l1.474-2.335H2.264L.79 13.239h2.156L0 17.84h12.072l4.563-7.259 1.652 2.66h-1.401l-1.473 2.299h4.347l1.473 2.3H24zm-11.461.107L3.7 8.604l9.52-.035 1.474-2.3z" />
    </svg>
  );
}
