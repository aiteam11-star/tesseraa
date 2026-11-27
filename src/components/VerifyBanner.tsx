import { getUserOrNull } from "@/lib/session";
import { blockedUntilVerified } from "@/lib/verification";
import { ResendVerification } from "./ResendVerification";

/** Site-wide reminder for people who have not confirmed their email yet. */
export async function VerifyBanner() {
  const user = await getUserOrNull();
  if (!user || !blockedUntilVerified(user)) return null;
  return (
    <div role="status" className="border-b border-warn/40 bg-warn/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <span>Confirm your email (<strong>{user.email}</strong>) to publish briefs and apply to projects. We sent you a link.</span>
        <ResendVerification />
      </div>
    </div>
  );
}
