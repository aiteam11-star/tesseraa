export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const formatDays = (d: number) => (d <= 21 ? `${d} days` : `${d} days · about ${Math.round(d / 7)} weeks`);
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const timeAgo = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};
