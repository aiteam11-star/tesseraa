import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/CoverArt";
import { clientCompletion } from "@/lib/completion";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "My profile" };

export default async function MyProfilePage() {
  const { role, user } = await getCurrentUser();
  if (role === "freelancer" && user.profile) redirect(`/freelancers/${user.profile.id}`);
  const c = user.clientProfile;
  const completion = clientCompletion(user);
  const rows: [string, string][] = [["Company", c?.company ?? ""], ["Industry", c?.industry ?? ""], ["Website", c?.website ?? ""], ["Location", c?.location ?? ""], ["Time zone", c?.timezone ?? ""]];
  return (
    <article className="space-y-8">
      <header className="flex flex-wrap items-start gap-5">
        <Avatar name={user.name} hue={user.hue} size={80} src={user.avatarFileId ? `/api/files/${user.avatarFileId}` : null} />
        <div className="min-w-0 flex-1">
          <p className="label">Client</p>
          <h1 className="text-5xl leading-tight">{user.name}</h1>
          <p className="mt-1 text-lg text-muted">{c?.company || "Add your company name"}</p>
        </div>
        <Link href="/profile/edit" className="btn btn-primary">Edit profile</Link>
      </header>
      {completion.percent < 100 && (
        <p role="status" className="rounded-md border border-line bg-sunken px-4 py-3 text-sm">Your profile is {completion.percent}% complete. Missing: {completion.missing.map((m) => m.label.toLowerCase()).join(", ")}. <Link href="/profile/edit" className="underline underline-offset-4">Complete it</Link></p>
      )}
      <section className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div><h2 className="text-3xl">About the company</h2><p className="mt-2 max-w-2xl text-lg">{c?.description || <span className="text-muted">No description yet.</span>}</p></div>
        <dl className="card space-y-3 p-5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k}><dt className="label">{k}</dt><dd className="mt-0.5 break-words">{k === "Website" && v ? <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="text-accent-strong underline underline-offset-4">{v}</a> : v || <span className="text-muted">Not set</span>}</dd></div>
          ))}
        </dl>
      </section>
    </article>
  );
}
