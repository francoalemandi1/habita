import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentMember } from "@/lib/session";
import { PlanesSegments } from "@/components/features/planes/planes-segments";
import { APP_ROUTES } from "@habita/contracts";

export default async function PlanesPage() {
  const member = await getCurrentMember();
  if (!member) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link href={APP_ROUTES.casa} className="inline-flex items-center gap-1 text-monte">
        <ChevronLeft className="size-5" strokeWidth={1.75} />
        <span className="text-[16px] font-medium">Casa</span>
      </Link>

      <h1 className="mt-4 text-[32px] font-bold leading-[1.05] tracking-[-.035em] text-ink">Planes</h1>

      <div className="mt-4">
        <PlanesSegments />
      </div>
    </div>
  );
}
