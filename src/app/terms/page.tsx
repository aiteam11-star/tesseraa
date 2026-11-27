export const metadata = { title: "Terms and privacy" };

export default function TermsPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="text-5xl">Terms and privacy</h1>
      <p className="text-muted">Plain-language summary for this project. Replace with your own legal text before launching to the public.</p>
      <h2 className="text-3xl">Using Tessera</h2>
      <p>You are responsible for the accuracy of what you post. Do not upload files you do not have the right to share. Do not use Tessera to harass or mislead other people.</p>
      <h2 className="text-3xl">Your data</h2>
      <p>We store your account details, profile, projects and uploaded files so the service can work. Resumes are private: only you and clients you have invited or applied to can download them. You can change your profile and files at any time.</p>
      <h2 className="text-3xl">Matching</h2>
      <p>Match scores are calculated from the information on profiles and project briefs. They are guidance, not a guarantee of fit.</p>
    </article>
  );
}
