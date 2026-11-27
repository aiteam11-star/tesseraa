import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotForm } from "@/components/auth/PasswordForms";

export const metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthLayout eyebrow="Account help" title="Reset your password" intro="Enter your email and we will send a link that lets you choose a new password.">
      <ForgotForm />
    </AuthLayout>
  );
}
