import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEligibilityProfileId } from "@/lib/eligibility-data";
import { EligibilityLanding } from "@/components/eligibility/eligibility-landing";

export const metadata: Metadata = { title: "Eligibility Calculator" };

export default async function EligibilityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existingId = await getEligibilityProfileId(session.user.id);
  return <EligibilityLanding existingId={existingId} />;
}
