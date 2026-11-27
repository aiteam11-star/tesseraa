export function Logo({ size = 28 }: { size?: number }) {
  // Four tiles, one notched and offset: the mosaic in miniature.
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="2" y="2" width="11" height="11" rx="1.5" fill="rgb(var(--ink))" />
      <path d="M15 2h11v8.5h-3v2.5h-3.5v-2.5H15z" fill="rgb(var(--accent))" />
      <path d="M2 15h8.5v3H13v8H2z" fill="rgb(var(--accent) / 0.45)" />
      <rect x="15" y="15" width="11" height="11" rx="1.5" fill="rgb(var(--ink) / 0.75)" />
    </svg>
  );
}
