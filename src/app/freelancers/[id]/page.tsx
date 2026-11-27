import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, CoverArt } from "@/components/CoverArt";
import { SaveButton } from "@/components/SaveButton";
import { StickerArt } from "@/components/StickerArt";
import { db } from "@/lib/db";
import { freelancerCompletion } from "@/lib/completion";
import { money } from "@/lib/format";
import { loadFreelancer } from "@/lib/queries";
import { statusLabel } from "@/lib/profileOptions";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const f = await loadFreelancer((await params).id);
  return { title: f ? f.name : "Freelancer" };
}

const AVAIL: Record<string, string> = { available: "Available now", limited: "Limited availability", unavailable: "Not taking work" };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { role, user } = await getCurrentUser();
  const f = await loadFreelancer((await params).id);
  if (!f) notFound();
  const isOwner = f.userId === user.id;
  const [thanks, completed, row, files, shortlisted, related] = await Promise.all([
    db.thankYou.findMany({ where: { toId: f.userId }, include: { from: true, project: true }, orderBy: { createdAt: "desc" } }),
    db.project.count({ where: { hiredId: f.id, status: "completed" } }),
    db.freelancerProfile.findUnique({ where: { id: f.id }, include: { skills: true, user: true } }),
    db.fileAsset.findMany({ where: { ownerId: f.userId, kind: "portfolio" }, orderBy: { createdAt: "asc" } }),
    role === "client" ? db.savedFreelancer.count({ where: { userId: user.id, freelancerId: f.id } }) : Promise.resolve(0),
    role === "client" ? db.proposal.count({ where: { freelancerId: f.id, project: { clientId: user.id } } }) : Promise.resolve(0),
  ]);
  const level = new Map(row?.skills.map((s) => [s.name, s.proficiency]));
  const canResume = f.hasResume && (isOwner || related > 0);
  const resumeId = canResume ? (await db.fileAsset.findFirst({ where: { id: row!.resumeFileId ?? "", ownerId: f.userId } }))?.id : null;
  const completion = isOwner && row ? freelancerCompletion({ name: f.name, avatarFileId: row.user.avatarFileId, profile: row, portfolioCount: f.portfolio.length, sidequestCount: f.sidequests.length }) : null;
  const rate = f.hourlyRate > 0 ? `${money(f.hourlyRate)}/h` : "Not set";

  return (
    <article className="space-y-10">
      <header className="flex flex-wrap items-start gap-5">
        <Avatar name={f.name} hue={f.hue} size={80} src={f.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="label">{f.isDemo ? "Sample profile" : "Freelancer"}</p>
          <h1 className="text-5xl leading-tight">{f.name}</h1>
          <p className="mt-1 text-lg text-muted">{f.headline || "No title yet"}</p>
          {(f.currentStatus || f.country) && (
            <p className="mt-2 flex flex-wrap gap-2 text-sm">{f.currentStatus && <span className="chip chip-accent">{statusLabel(f.currentStatus)}</span>}{f.country && <span className="chip">{f.country}</span>}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {isOwner && <Link href="/profile/edit" className="btn btn-primary !min-h-[36px] !px-3 !py-1.5 text-sm">Edit profile</Link>}
            {role === "client" && <SaveButton type="freelancer" id={f.id} initial={shortlisted > 0} />}
            {role === "client" && <Link href="/matches" className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-sm">Back to matches</Link>}
            {resumeId && <a href={`/api/files/${resumeId}`} className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-sm">Download resume</a>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[["Rate", f.pricingModel === "project" && f.minProjectPrice > 0 ? `${rate} · from ${money(f.minProjectPrice)}` : rate], ["Experience", `${f.yearsExperience} ${f.yearsExperience === 1 ? "year" : "years"}`], ["Availability", f.availabilityHoursPerWeek > 0 ? `${f.availabilityHoursPerWeek} h/week` : AVAIL[f.availabilityStatus]], ["Time zone", f.timezone || "Not set"]].map(([k, v]) => (
            <div key={k} className="card px-3 py-2"><dt className="label">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
          ))}
        </dl>
      </header>

      {completion && completion.percent < 100 && (
        <p role="status" className="rounded-md border border-line bg-sunken px-4 py-3 text-sm">Your profile is {completion.percent}% complete. Missing: {completion.missing.slice(0, 5).map((m) => m.label.toLowerCase()).join(", ")}. <Link href="/profile/edit" className="underline underline-offset-4">Complete it</Link> to improve your matches.</p>
      )}

      <section aria-labelledby="about" className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 id="about" className="text-3xl">About</h2>
          <p className="mt-2 max-w-2xl whitespace-pre-line text-lg">{f.bio || <span className="text-muted">No introduction yet.</span>}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {f.skills.length === 0 ? <span className="text-sm text-muted">No skills listed yet.</span> : f.skills.map((s) => <span key={s} className="chip">{s}{level.get(s) ? <span className="ml-1 text-muted">· {level.get(s)}</span> : null}</span>)}
          </div>
        </div>
        <div className="card space-y-3 p-5 text-sm">
          <h2 className="text-2xl">Details</h2>
          <dl className="space-y-3">
            <div><dt className="label">Availability</dt><dd className="mt-0.5">{AVAIL[f.availabilityStatus]}{f.preferredStartDate ? ` · from ${new Date(f.preferredStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}</dd></div>
            {f.languages.length > 0 && <div><dt className="label">Languages</dt><dd className="mt-0.5">{f.languages.join(", ")}</dd></div>}
            {f.education && <div><dt className="label">Education</dt><dd className="mt-0.5 whitespace-pre-line">{f.education}</dd></div>}
            {f.certifications && <div><dt className="label">Certifications</dt><dd className="mt-0.5 whitespace-pre-line">{f.certifications}</dd></div>}
            {f.communicationStyle && <div><dt className="label">Communication</dt><dd className="mt-0.5">{f.communicationStyle}</dd></div>}
            {(f.linkedinUrl || f.portfolioUrl) && (
              <div><dt className="label">Links</dt><dd className="mt-0.5 space-y-1">
                {f.linkedinUrl && <a href={f.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="block break-all text-accent-strong underline underline-offset-4">LinkedIn</a>}
                {f.portfolioUrl && <a href={f.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="block break-all text-accent-strong underline underline-offset-4">Portfolio website</a>}
              </dd></div>
            )}
          </dl>
        </div>
      </section>

      <section aria-labelledby="cases">
        <h2 id="cases" className="text-3xl">Previous projects</h2>
        {f.portfolio.length === 0 && files.length === 0 ? (
          <p className="card mt-4 p-5 text-sm text-muted">{isOwner ? "You have not added any projects yet." : "No projects added yet."}</p>
        ) : (
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {f.portfolio.map((p) => (
              <article key={p.id} className="card overflow-hidden">
                <CoverArt hue={p.hue} shape={p.shape} className="h-32 w-full" />
                <div className="space-y-2 p-5 text-sm">
                  <h3 className="text-2xl">{p.title}</h3>
                  {p.approach || p.result ? (
                    <>
                      <p><span className="label mr-1">Problem</span>{p.problem}</p>
                      {p.approach && <p><span className="label mr-1">Approach</span>{p.approach}</p>}
                      {p.result && <p><span className="label mr-1">Result</span>{p.result}</p>}
                    </>
                  ) : <p className="whitespace-pre-line">{p.problem}</p>}
                  {p.tags.length > 0 && <div className="flex flex-wrap gap-1.5 pt-1">{p.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
                </div>
              </article>
            ))}
            {files.map((file) => (
              <article key={file.id} className="card overflow-hidden">
                {file.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/files/${file.id}`} alt={file.name} className="h-40 w-full object-cover" />
                ) : <div className="flex h-40 items-center justify-center bg-sunken text-sm text-muted">PDF document</div>}
                <div className="flex items-center justify-between gap-2 p-4 text-sm"><span className="truncate">{file.name}</span><a href={`/api/files/${file.id}`} className="text-accent-strong underline underline-offset-4">Open</a></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="side">
        <h2 id="side" className="text-3xl">Sidequests</h2>
        <p className="mt-1 text-sm text-muted">Side projects and experiments built for the love of it.</p>
        {f.sidequests.length === 0 ? (
          <p className="card mt-4 p-5 text-sm text-muted">{isOwner ? "No sidequests yet. Add one from Edit profile." : "No sidequests yet."}</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {f.sidequests.map((q) => (
              <li key={q.id} className="card p-5 text-sm">
                <h3 className="text-2xl">{q.title}</h3>
                {q.description && <p className="mt-1 whitespace-pre-line">{q.description}</p>}
                {q.url && <a href={q.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 block break-all text-accent-strong underline underline-offset-4">{q.url.replace(/^https?:\/\//, "")}</a>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="thanks">
        <h2 id="thanks" className="text-3xl">Thank-yous</h2>
        <p className="mt-1 text-sm text-muted">Clients leave a short note and a sticker when a project ends. There are no star ratings. {completed} completed {completed === 1 ? "project" : "projects"} on Tessera.</p>
        {thanks.length === 0 ? (
          <p className="card mt-4 p-5 text-sm text-muted">No thank-yous yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {thanks.map((t) => (
              <li key={t.id} className="card flex gap-4 p-4">
                <StickerArt id={t.sticker} size={64} />
                <div className="text-sm"><p>{t.note}</p><p className="mt-2 text-xs text-muted">{t.from.name} · {t.project.title}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
