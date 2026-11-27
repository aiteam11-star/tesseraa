import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetForm } from "@/components/auth/PasswordForms";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthLayout eyebrow="Account help" title="Choose a new password">
      {token ? <ResetForm token={token} /> : (
        <div className="space-y-3 text-sm"><p role="alert">This reset link is missing its token. Request a new one.</p><Link href="/forgot-password" className="btn btn-primary">Request a reset link</Link></div>
      )}
    </AuthLayout>
  );
}
