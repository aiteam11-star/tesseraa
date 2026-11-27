import { ClientHome } from "@/components/dashboard/ClientHome";
import { FreelancerHome } from "@/components/dashboard/FreelancerHome";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { role, user } = await getCurrentUser();
  if (role === "freelancer") {
    // Accounts created before profiles existed get an empty profile so the dashboard always renders.
    if (!user.profile) user.profile = { ...(await db.freelancerProfile.create({ data: { userId: user.id } })), skills: [] };
    return <FreelancerHome user={user} />;
  }
  return <ClientHome user={user} />;
}
