import { buildPath, type ShapeSpec } from "./notch";

/** Absolutely positioned background that draws the notched outline behind tile content. */
export function TileShape({
  spec, className = "fill-surface stroke-line", dashed = false,
}: { spec: ShapeSpec; className?: string; dashed?: boolean }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={buildPath(spec)} className={className} strokeWidth={dashed ? 1.5 : 1} strokeDasharray={dashed ? "5 4" : undefined} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
