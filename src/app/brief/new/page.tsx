import { redirect } from "next/navigation";
import { ComposeMosaic } from "@/components/ComposeMosaic";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "New brief" };

export default async function NewBriefPage() {
  const { role } = await getCurrentUser();
  if (role !== "client") redirect("/matches");
  return (
    <div>
      <div className="mb-8 max-w-3xl">
        <p className="label">Step 1 of 3 · Describe the project</p>
        <h1 className="mt-1 text-5xl leading-[1.05] sm:text-6xl">Describe the project. We will build the brief.</h1>
        <p className="mt-4 text-lg text-muted">Write it the way you would tell a friend. Tessera breaks it into tiles, suggests a fair price, and shows which freelancers fit and which do not. Nothing is published until you say so.</p>
      </div>
      <ComposeMosaic />
    </div>
  );
}
