export function OutlookIcon({ rating, size = 40 }: { rating: "clear" | "cloudy" | "stormy"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 40 40", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (rating === "clear")
    return (<svg {...common}><circle cx="20" cy="20" r="7" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (<line key={a} x1="20" y1="6" x2="20" y2="9.5" transform={`rotate(${a} 20 20)`} />))}</svg>);
  if (rating === "cloudy")
    return (<svg {...common}><path d="M12 29h17a6 6 0 000-12 8 8 0 00-15.5-1.5A5.5 5.5 0 0012 29z" /></svg>);
  return (<svg {...common}><path d="M12 25h17a6 6 0 000-12 8 8 0 00-15.5-1.5A5.5 5.5 0 0012 25z" /><path d="M21 25l-4 6h5l-3 6" /></svg>);
}
