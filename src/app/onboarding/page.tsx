import { ClientProfileForm } from "@/components/profile/ClientProfileForm";
import { FreelancerProfileForm } from "@/components/profile/FreelancerProfileForm";
import { clientInitial, freelancerInitial } from "@/lib/profileInit";
import { skillVocabulary } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const { role, user } = await getCurrentUser();
  return (
    <div>
      <p className="label">Step 1 of 1 · Welcome, {user.name.split(" ")[0]}</p>
      <h1 className="mt-1 text-5xl">{role === "freelancer" ? "Build your professional profile" : "Tell freelancers about your company"}</h1>
      <p className="mt-2 mb-8 max-w-2xl text-muted">
        {role === "freelancer"
          ? "Add your title, introduction and at least one skill to start getting matched. Everything else is optional and you can save and come back any time."
          : "A few details help freelancers trust your briefs. Everything is optional and you can come back to it later."}
      </p>
      {role === "freelancer"
        ? <FreelancerProfileForm mode="onboarding" initial={await freelancerInitial(user)} skillSuggestions={await skillVocabulary()} />
        : <ClientProfileForm mode="onboarding" initial={await clientInitial(user)} />}
    </div>
  );
}
