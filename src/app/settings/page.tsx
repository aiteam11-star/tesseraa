import { AccountForm } from "@/components/settings/AccountForm";
import { ResendVerification } from "@/components/ResendVerification";
import { getCurrentUser } from "@/lib/session";
import { isVerified, verificationRequired } from "@/lib/verification";

export const metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const { role, user } = await getCurrentUser();
  return (
    <div>
      <h1 className="text-5xl">Account settings</h1>
      <p className="mt-2 mb-8 text-muted">Your sign-in details. Profile information lives under Edit Profile.</p>
      <div className="card mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 p-5 text-sm" aria-label="Email confirmation">
        <span className={`chip ${isVerified(user) ? "chip-accent" : ""}`}>{isVerified(user) ? "Email confirmed" : "Email not confirmed"}</span>
        <span className="text-muted">{isVerified(user) ? user.email : verificationRequired() ? `Confirm ${user.email} to publish briefs and apply to projects.` : `${user.email} is not confirmed. Confirmation is not required on this site yet.`}</span>
        {!isVerified(user) && <ResendVerification />}
      </div>
      <AccountForm name={user.name} email={user.email} role={role} />
    </div>
  );
}
