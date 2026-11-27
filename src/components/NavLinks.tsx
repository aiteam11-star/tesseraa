"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-1 text-sm">
      {links.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 transition-colors ${active ? "bg-sunken text-ink" : "text-muted hover:bg-sunken hover:text-ink"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
