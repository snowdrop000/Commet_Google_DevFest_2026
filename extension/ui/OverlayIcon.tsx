const paths = {
  coin: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM14 8.5h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-3M12 7v11",
  menu: "M5 6h14M5 12h14M5 18h14",
  close: "m6 6 12 12M6 18 18 6",
  check: "m14 5 5 5M5 19l4-1 11-11a2.8 2.8 0 0 0-4-4L5 14l-1 6 5-2",
  status: "M5 20V11M12 20V4M19 20v-6",
  wardrobe: "M9 5a3 3 0 1 1 5 2l-2 1v3M12 11 3 17v2h18v-2l-9-6Z",
  gacha: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM19 3v4M17 5h4",
  settings: "M5 6h14M5 12h14M5 18h14M9 4v4M15 10v4M9 16v4",
} as const;

export function OverlayIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
