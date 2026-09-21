import { SVGProps } from "react";

/*
 * One hand-drawn stroke set, all on a 24-unit grid at 1.6 stroke weight.
 * Emoji were doing this job before: they ignore currentColor, so they could
 * not sit in a themed button or dim with muted text, and every OS drew them
 * differently. These inherit colour and size from their container.
 */
const PATHS = {
  // Navigation
  reports: "M4 19.5V5M4 19.5h16M8 16V10M12.5 16V6.5M17 16v-4",
  income:
    "M3 7.5h18v11H3zM3 7.5 7 4h10l4 3.5M12 15.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z",
  suppliers:
    "M4 20V8.5l8-4.5 8 4.5V20M4 20h16M9.5 20v-5h5v5M8.5 11.5h1.5M14 11.5h1.5",
  subcontractors:
    "M5 15.5a7 7 0 0 1 14 0M3.5 15.5h17M12 4v2.2M8.6 6.4l1 2M15.4 6.4l-1 2M9 20h6",
  projects: "M5 20V6.5h9V20M5 20h14M14 20v-7h5v7M8 10h3M8 13.5h3M16.5 16h1",
  clients:
    "M12 12a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8ZM5 19.5c0-3.3 3.1-5.2 7-5.2s7 1.9 7 5.2",
  wrench:
    "M15.6 4.4a4.6 4.6 0 0 0-5.9 5.9l-5 5a1.8 1.8 0 0 0 2.5 2.5l5-5a4.6 4.6 0 0 0 5.9-5.9l-2.6 2.6-2.5-.5-.5-2.5 2.6-2.6Z",
  initiators:
    "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 13.3a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z",
  settings: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4.6v4.8M8 14.6v4.8",
  percent:
    "M6.5 17.5 17.5 6.5M8.3 10.6a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6ZM15.7 18a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z",
  receipt:
    "M5.5 20.5V3.5h13v17l-2.2-1.5-2.1 1.5-2.2-1.5-2.2 1.5L7.7 19zM9 8h6M9 11.5h6M9 15h3.5",

  // Actions
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16.2 16.2 20.5 20.5",
  edit: "M4.5 19.5h3.2L18.4 8.8a2.3 2.3 0 0 0-3.2-3.2L4.5 16.3v3.2ZM13.8 7l3.2 3.2",
  trash:
    "M4.5 6.8h15M9.5 6.8V4.5h5v2.3M6.6 6.8 7.5 20h9l.9-13.2M10.3 10.5v6M13.7 10.5v6",
  plus: "M12 5.5v13M5.5 12h13",
  close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  menu: "M4 7h16M4 12h16M4 17h16",
  download: "M12 3.8v10.4M8 10.4l4 4 4-4M4.5 19.5h15",
  logout:
    "M9 20.5H5.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2H9M16 16.5l4.5-4.5L16 7.5M20.5 12H9",
  check: "M5 12.5l4.5 4.5L19 6.5",
  // Partial settlement — the tilde this button used to carry as text.
  wave: "M5 13.5c1.75-3.5 5.25-3.5 7 0s5.25 3.5 7 0",
  chevronDown: "M6 9.5 12 15.5l6-6",
  chevronLeft: "M14.5 5.5 8 12l6.5 6.5",
  chevronRight: "M9.5 5.5 16 12l-6.5 6.5",
  arrowUp: "M12 19.5V5.2M6.2 11 12 5.2 17.8 11",
  arrowDown: "M12 4.5v14.3M6.2 13 12 18.8 17.8 13",
  sortable: "M7.5 10 12 5.5l4.5 4.5M7.5 14 12 18.5l4.5-4.5",
  transfer: "M4 8.5h13.5M14 5l3.5 3.5L14 12M20 15.5H6.5M10 12l-3.5 3.5L10 19",
  sliders:
    "M6 20V14M6 10V4M12 20v-9M12 7V4M18 20v-5M18 11V4M3.5 14h5M9.5 7h5M15.5 15h5",

  // Theme
  sun: "M12 16.8a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6ZM12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z",

  // States
  alert: "M12 8v5M12 16.3v.2M12 3.5 21 19.5H3L12 3.5Z",
  image:
    "M4 5.5h16v13H4zM4 15.5l4.5-4.5 4 4 3-2.5 4.5 4M9 10.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z",
  inbox: "M4 12.5h4l1.5 3h5l1.5-3h4M4 12.5 6.5 5h11L20 12.5v6.5H4v-6.5Z",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, className = "", ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
      className={`shrink-0 ${className}`}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * The product mark: a beet, drawn rather than set. Two leaves, a root body and
 * a taproot — the only place in the app that carries a filled brand shape.
 */
export function BeetMark({
  size = 24,
  className = "",
  ...props
}: Omit<IconProps, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path
        d="M12 21.5c-3.6 0-6.4-2.8-6.4-6.2 0-3 2-5.4 4.6-6.6.8 1.2 2.8 1.2 3.6 0 2.6 1.2 4.6 3.6 4.6 6.6 0 3.4-2.8 6.2-6.4 6.2Z"
        fill="currentColor"
      />
      <path
        d="M12 8.6V3.2M12 6.2c-1.6-2-3.4-2.6-5-2.4.2 1.7 1.3 3.2 3.2 3.6M12 6.6c1.5-2.2 3.3-2.9 5-2.7-.2 1.8-1.4 3.4-3.4 3.8"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}
