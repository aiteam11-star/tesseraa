import { Logo } from "../Logo";

/** Shared frame for login, sign up and password pages: a short pitch beside the form. */
export function AuthLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_440px] lg:gap-16 lg:pt-6">
      <aside className="hidden lg:block" aria-hidden="true">
        <Logo size={44} />
        <h2 className="mt-6 max-w-md text-5xl leading-[1.08]">Every project, <em className="text-accent-strong">seated</em> exactly right.</h2>
        <p className="mt-4 max-w-md text-muted">Write a messy brief. Tessera turns it into tiles, scores freelancers on facts you can check, and flags scope or budget trouble early.</p>
        <div className="mt-8 grid max-w-sm grid-cols-4 gap-2.5">
          {["bg-ink", "bg-accent", "bg-accent/40", "bg-ink/70", "bg-accent/40", "bg-ink/70", "bg-ink", "border border-dashed border-warn/70"].map((c, i) => (
            <div key={i} className={`aspect-square rounded-md ${c}`} />
          ))}
        </div>
      </aside>
      <section className="card p-6 sm:p-8">
        <p className="label">{eyebrow}</p>
        <h1 className="mt-1 text-4xl">{title}</h1>
        {intro && <p className="mt-2 text-sm text-muted">{intro}</p>}
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
