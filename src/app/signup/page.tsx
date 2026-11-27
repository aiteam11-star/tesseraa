import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import { getUserOrNull } from "@/lib/session";

export const metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  if (await getUserOrNull()) redirect("/dashboard");
  const { role } = await searchParams;
  return (
    <AuthLayout eyebrow="Join Tessera" title="Create your account" intro="Pick the account type that fits. You can finish your profile after signing up.">
      <SignupForm initialRole={role === "client" || role === "freelancer" ? role : undefined} />
    </AuthLayout>
  );
}
