/**
 * Notched tile outlines. Paths are drawn in a 0-100 box and stretched to the tile
 * (preserveAspectRatio="none" with non-scaling strokes), so every tile can have its own edge.
 * d > 0 is a tab sticking out, d < 0 is a slot cut in. `at` and `w` are positions along the edge, 0-100.
 */
export type Notch = { at: number; w: number; d: number };
export type ShapeSpec = {
  top?: Notch[]; right?: Notch[]; bottom?: Notch[]; left?: Notch[];
  chamfer?: { tl?: number; tr?: number; br?: number; bl?: number };
};

const sorted = (n: Notch[] | undefined, dir: 1 | -1) => [...(n ?? [])].sort((a, b) => (a.at - b.at) * dir);

export function buildPath(spec: ShapeSpec): string {
  const c = { tl: 0, tr: 0, br: 0, bl: 0, ...spec.chamfer };
  const k = 0.18; // slope of the notch walls, as a share of its width
  const pts: [number, number][] = [[c.tl, 0]];

  for (const { at, w, d } of sorted(spec.top, 1)) pts.push([at - w / 2, 0], [at - w / 2 + w * k, -d], [at + w / 2 - w * k, -d], [at + w / 2, 0]);
  pts.push([100 - c.tr, 0], [100, c.tr]);
  for (const { at, w, d } of sorted(spec.right, 1)) pts.push([100, at - w / 2], [100 + d, at - w / 2 + w * k], [100 + d, at + w / 2 - w * k], [100, at + w / 2]);
  pts.push([100, 100 - c.br], [100 - c.br, 100]);
  for (const { at, w, d } of sorted(spec.bottom, -1)) pts.push([at + w / 2, 100], [at + w / 2 - w * k, 100 + d], [at - w / 2 + w * k, 100 + d], [at - w / 2, 100]);
  pts.push([c.bl, 100], [0, 100 - c.bl]);
  for (const { at, w, d } of sorted(spec.left, -1)) pts.push([0, at + w / 2], [-d, at + w / 2 - w * k], [-d, at - w / 2 + w * k], [0, at - w / 2]);
  pts.push([0, c.tl]);

  return "M" + pts.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join("L") + "Z";
}

export const BRIEF_SHAPES: Record<string, ShapeSpec> = {
  deliverables: { right: [{ at: 28, w: 18, d: -3 }], bottom: [{ at: 72, w: 12, d: 5 }], chamfer: { tl: 4 } },
  skills: { bottom: [{ at: 28, w: 22, d: -9 }], top: [{ at: 62, w: 20, d: 7 }], chamfer: { tr: 7 } },
  budget: { right: [{ at: 40, w: 24, d: 4 }], left: [{ at: 64, w: 22, d: -4 }], chamfer: { bl: 6 } },
  timeline: { top: [{ at: 42, w: 22, d: -9 }], bottom: [{ at: 66, w: 18, d: 7 }], chamfer: { br: 7, tl: 4 } },
  tone: { left: [{ at: 50, w: 26, d: 4 }], chamfer: { br: 8, tr: 3 } },
};

/** The seating tab on a freelancer tile, plus a chamfer that varies by freelancer so no two look identical. */
export function matchShape(seed: number): ShapeSpec {
  const corners = ["tl", "tr", "br", "bl"] as const;
  const corner = corners[seed % 4];
  return { left: [{ at: 50, w: 26, d: 3.5 }], chamfer: { [corner]: 4 + (seed % 3) * 1.5 } };
}

export const hashSeed = (s: string) => Array.from(s).reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
