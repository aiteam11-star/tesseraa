import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getUserOrNull } from "@/lib/session";

const STEPS = [
  ["Write a messy brief", "Describe the project in your own words. Tessera splits it into deliverables, skills, budget and timeline tiles."],
  ["See honest matches", "Freelancers are scored on skills, experience, budget and availability. A visible gap shows exactly what is missing."],
  ["Work with fewer surprises", "Scope changes and budget risk are flagged early, with a fair mini-quote for extra work."],
];

export default async function Home() {
  if (await getUserOrNull()) redirect("/dashboard");
  return (
    <div className="space-y-20 pt-4 sm:pt-10">
      <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Logo size={44} />
          <h1 className="mt-6 max-w-3xl text-5xl leading-[1.05] sm:text-7xl">Every project, <em className="text-accent-strong">seated</em> exactly right.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">Tessera is a freelance marketplace that matches clients and freelancers on facts you can check, then keeps scope and budget honest.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup?role=client" className="btn btn-primary">I want to hire</Link>
            <Link href="/signup?role=freelancer" className="btn btn-ghost">I am a freelancer</Link>
            <Link href="/login" className="btn !px-3 text-muted hover:text-ink">Log in</Link>
          </div>
        </div>
        <div aria-hidden="true" className="grid w-full max-w-md grid-cols-4 gap-3 justify-self-center">
          {["bg-ink", "bg-accent", "bg-accent/40", "bg-ink/70", "bg-accent/40", "bg-ink/70", "bg-ink", "border-2 border-dashed border-warn/70", "bg-accent", "bg-ink/70", "bg-accent/40", "bg-ink"].map((c, i) => (
            <div key={i} className={`aspect-square rounded-lg ${c}`} />
          ))}
        </div>
      </section>
      <section aria-labelledby="how">
        <h2 id="how" className="text-4xl">How it works</h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card p-6"><span className="label">Step {i + 1}</span><h3 className="mt-2 text-2xl">{t}</h3><p className="mt-2 text-sm text-muted">{d}</p></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
