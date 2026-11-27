import Link from "next/link";
import { timeAgo } from "@/lib/format";

export function Stat({ label, value, note, href }: { label: string; value: string | number; note?: string; href?: string }) {
  const body = (
    <>
      <span className="label">{label}</span>
      <b className="mt-2 block font-display text-4xl font-normal leading-none">{value}</b>
      {note && <small className="mt-1 block text-sm text-muted">{note}</small>}
    </>
  );
  return href
    ? <Link href={href} className="card block p-5 transition-colors hover:border-accent">{body}</Link>
    : <div className="card p-5">{body}</div>;
}

export function Panel({ title, id, action, children }: { title: string; id: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card" aria-labelledby={id}>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id={id} className="text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children, href, cta }: { children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className="p-5 text-sm text-muted" role="status">
      <p>{children}</p>
      {href && cta && <Link href={href} className="btn btn-ghost mt-3">{cta}</Link>}
    </div>
  );
}

export function ActivityList({ rows }: { rows: { id: string; description: string; href: string; createdAt: Date }[] }) {
  if (rows.length === 0) return <Empty>Nothing yet. Your activity shows up here.</Empty>;
  return (
    <ul className="px-5 pb-3">
      {rows.map((a) => (
        <li key={a.id} className="border-b border-line py-3 text-sm last:border-0">
          {a.href ? <Link href={a.href} className="hover:underline">{a.description}</Link> : a.description}
          <time className="block text-xs text-muted" dateTime={a.createdAt.toISOString()}>{timeAgo(a.createdAt.toISOString())}</time>
        </li>
      ))}
    </ul>
  );
}

export const STATUS_LABEL: Record<string, string> = { draft: "Draft", open: "Open", active: "In progress", completed: "Completed", cancelled: "Cancelled" };
export const statusChip = (s: string) => (s === "active" ? "chip-accent" : s === "cancelled" ? "chip-risk" : s === "draft" ? "chip-gap" : "");

export const dueLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
export function daysLeft(d: Date) {
  const n = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  return n < 0 ? `${-n} d overdue` : n === 0 ? "due today" : `${n} d left`;
}
