/** Generated cover art for portfolio items and avatars. No external images. */
export function CoverArt({ hue, shape = 0, className = "" }: { hue: number; shape?: number; className?: string }) {
  const a = `hsl(${hue} 55% 42%)`;
  const b = `hsl(${(hue + 40) % 360} 60% 62%)`;
  const c = `hsl(${(hue + 200) % 360} 45% 22%)`;
  const id = `g${hue}-${shape}`;
  return (
    <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Generated cover art">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <rect width="200" height="120" fill={`url(#${id})`} />
      {shape % 4 === 0 && (<><circle cx="150" cy="40" r="46" fill={b} opacity=".85" /><rect x="20" y="60" width="90" height="70" fill={c} opacity=".5" /></>)}
      {shape % 4 === 1 && (<><path d="M0 90 L70 20 L140 90 Z" fill={b} opacity=".8" /><path d="M80 120 L150 40 L210 100 L210 120Z" fill={c} opacity=".55" /></>)}
      {shape % 4 === 2 && (<>{[0, 1, 2, 3].map((i) => (<rect key={i} x={20 + i * 42} y={20 + (i % 2) * 28} width="34" height="60" rx="3" fill={i % 2 ? b : c} opacity=".75" />))}</>)}
      {shape % 4 === 3 && (<><circle cx="60" cy="60" r="38" fill={b} opacity=".8" /><circle cx="120" cy="60" r="38" fill={c} opacity=".6" /><circle cx="170" cy="60" r="24" fill="#fff" opacity=".18" /></>)}
    </svg>
  );
}

export function Avatar({ name, hue, size = 40, src }: { name: string; hue: number; size?: number; src?: string | null }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" aria-hidden="true" width={size} height={size} className="shrink-0 rounded-md object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-md font-display text-white"
      style={{ width: size, height: size, background: `hsl(${hue} 45% 32%)`, fontSize: size * 0.45 }}
    >
      {initials}
    </span>
  );
}
