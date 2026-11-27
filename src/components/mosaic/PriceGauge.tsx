"use client";
import { motion, useReducedMotion } from "framer-motion";
import { gaugePosition, type PriceVerdict } from "@/lib/scoring";

const CX = 60, CY = 58, R = 46;
const pt = (frac: number, r = R) => {
  const a = Math.PI * (1 - frac);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};
const arc = (f0: number, f1: number) => {
  const [x0, y0] = pt(f0), [x1, y1] = pt(f1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const COPY: Record<PriceVerdict, string> = { low: "Low", fair: "Fair", generous: "Generous" };

export function PriceGauge({
  budget, range, verdict, reason, loading, source,
}: {
  budget: number; range: { low: number; high: number }; verdict: PriceVerdict; reason?: string; loading?: boolean; source?: "ai" | "fallback";
}) {
  const reduce = useReducedMotion();
  const pos = gaugePosition(budget, range);
  const a = gaugePosition(range.low * 0.9, range);
  const b = gaugePosition(range.high * 1.15, range);
  const angle = -90 + pos * 180;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 120 68" className="w-32 shrink-0" role="img" aria-label={`Budget is ${verdict} compared with the suggested range`}>
        <path d={arc(0, a)} stroke="rgb(var(--warn))" strokeWidth="9" fill="none" opacity={verdict === "low" ? 1 : 0.35} />
        <path d={arc(a, b)} stroke="rgb(var(--accent))" strokeWidth="9" fill="none" opacity={verdict === "fair" ? 1 : 0.35} />
        <path d={arc(b, 1)} stroke="rgb(var(--muted))" strokeWidth="9" fill="none" opacity={verdict === "generous" ? 1 : 0.35} />
        <motion.g initial={false} animate={{ rotate: angle }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 16 }} style={{ originX: `${CX}px`, originY: `${CY}px` }}>
          <line x1={CX} y1={CY} x2={CX} y2={CY - 38} stroke="rgb(var(--ink))" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
        <circle cx={CX} cy={CY} r="4.5" fill="rgb(var(--ink))" />
      </svg>
      <div className="min-w-0" aria-live="polite">
        <div className="label">Fair-price meter</div>
        <div className="font-display text-3xl leading-tight">{COPY[verdict]}</div>
        {loading && !reason ? <div className="skeleton mt-1 h-3 w-40" /> : <p className="mt-0.5 text-sm text-muted">{reason}</p>}
        {source === "fallback" && reason && <p className="mt-1 text-[11px] text-muted">Rule-based note</p>}
      </div>
    </div>
  );
}
