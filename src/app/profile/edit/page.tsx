import { ClientProfileForm } from "@/components/profile/ClientProfileForm";
import { FreelancerProfileForm } from "@/components/profile/FreelancerProfileForm";
import { clientInitial, freelancerInitial } from "@/lib/profileInit";
import { skillVocabulary } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Edit profile" };

export default async function EditProfilePage() {
  const { role, user } = await getCurrentUser();
  return (
    <div>
      <h1 className="mb-8 text-5xl">Edit profile</h1>
      {role === "freelancer"
        ? <FreelancerProfileForm mode="edit" initial={await freelancerInitial(user)} skillSuggestions={await skillVocabulary()} />
        : <ClientProfileForm mode="edit" initial={await clientInitial(user)} />}
    </div>
  );
}
