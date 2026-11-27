import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { getUserOrNull } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  if (await getUserOrNull()) redirect("/dashboard");
  const { next, reset } = await searchParams;
  return (
    <AuthLayout eyebrow="Welcome back" title="Sign in to Tessera">
      <LoginForm next={next} notice={reset ? "Your password was changed. Sign in with the new one." : undefined} />
    </AuthLayout>
  );
}
