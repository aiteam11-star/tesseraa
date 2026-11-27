import { STICKERS } from "@/lib/stickers";
import { TileShape } from "./TileShape";

const GLYPH: Record<string, React.ReactNode> = {
  "clear-brief": <path d="M-12 -8H12M-12 0H12M-12 8H4" strokeWidth="3" strokeLinecap="round" />,
  "sharp-eye": <><circle r="11" strokeWidth="3" fill="none" /><circle r="3.5" fill="currentColor" stroke="none" /></>,
  "steady-hands": <path d="M-13 -5H13M-13 5H13" strokeWidth="4" strokeLinecap="round" />,
  "fast-turn": <path d="M-12 -9L-2 0L-12 9M0 -9L10 0L0 9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  generous: <path d="M0 -12V12M-12 0H12" strokeWidth="4" strokeLinecap="round" />,
  thoughtful: <path d="M-12 -9H12V5H0L-7 11V5H-12Z" strokeWidth="3" strokeLinejoin="round" fill="none" />,
};

export function StickerArt({ id, size = 84, withLabel = true }: { id: string; size?: number; withLabel?: boolean }) {
  const s = STICKERS.find((x) => x.id === id) ?? STICKERS[0];
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: size + 8 }}>
      <div className="relative" style={{ width: size, height: size }}>
        <TileShape
          spec={{ top: [{ at: 50, w: 22, d: 6 }], right: [{ at: 55, w: 20, d: -6 }], bottom: [{ at: 40, w: 22, d: -6 }], left: [{ at: 50, w: 20, d: 6 }], chamfer: { tl: 8, br: 8 } }}
          className="stroke-transparent"
        />
        <svg viewBox="-30 -30 60 60" className="absolute inset-0 h-full w-full" role="img" aria-label={`${s.label} sticker`} style={{ color: "#fff" }}>
          <path d="M-26 -26H-6Q0 -32 6 -26H26V-6Q32 0 26 6V26H6Q0 20 -6 26H-26V6Q-20 0 -26 -6Z" fill={`hsl(${s.hue} 50% 32%)`} />
          <g stroke="#fff" fill="none">{GLYPH[s.id]}</g>
        </svg>
      </div>
      {withLabel && <span className="text-center text-xs text-muted">{s.label}</span>}
    </div>
  );
}
