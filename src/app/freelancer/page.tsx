import { redirect } from "next/navigation";

// The freelancer dashboard now lives at /dashboard for both account types.
export default function FreelancerRedirect() {
  redirect("/dashboard");
}
