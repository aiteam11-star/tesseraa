import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { VerifyEmailConfirm } from "@/components/auth/VerifyEmailConfirm";

export const metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthLayout eyebrow="Account" title="Confirm your email">
      {token ? <VerifyEmailConfirm token={token} /> : (
        <div className="space-y-3 text-sm"><p role="alert">This link is missing its token. Open the link from your email again, or ask for a new one in Account Settings.</p><Link href="/settings" className="btn btn-primary">Account Settings</Link></div>
      )}
    </AuthLayout>
  );
}
