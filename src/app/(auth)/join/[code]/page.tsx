import { headers } from "next/headers";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Home, X } from "lucide-react";
import { Button } from "@/components/ds";
import { HabitaLogo } from "@/components/ui/habita-logo";
import { JoinForm } from "./join-form";
import { MobileJoinRedirect } from "./mobile-join-redirect";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

const IOS_APP_STORE_URL = "https://apps.apple.com/app/habita/id0000000000";
const ANDROID_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=casa.habita.app";

function detectMobilePlatform(userAgent: string): "ios" | "android" | "web" {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

/** Unirse — entry via invite link, per handoff §5.3. */
export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") ?? "";
  const platform = detectMobilePlatform(userAgent);

  const household = await prisma.household.findUnique({
    where: { inviteCode: normalizedCode },
    select: { id: true, name: true },
  });

  if (!household) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-8">
        <div className="w-full rounded-2xl bg-surface p-6 sm:p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-ladrillo-soft">
              <X className="size-6 text-ladrillo-text" strokeWidth={1.75} />
            </div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Código inválido</h1>
            <p className="mt-2 text-ink-2">El link de invitación no es válido o ya no está disponible.</p>
          </div>
        </div>
      </div>
    );
  }

  if (platform !== "web") {
    const deepLink = `habita://join?code=${normalizedCode}`;
    const storeUrl = platform === "ios" ? IOS_APP_STORE_URL : ANDROID_PLAY_STORE_URL;
    return (
      <MobileJoinRedirect
        householdName={household.name}
        deepLink={deepLink}
        storeUrl={storeUrl}
        platform={platform}
      />
    );
  }

  const session = await auth();

  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-8">
        <div className="w-full rounded-2xl bg-surface p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4">
              <HabitaLogo size={64} />
            </div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Unite a {household.name}</h1>
            <p className="mt-2 text-ink-2">Te invitaron a formar parte de este hogar en Habita</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: `/join/${normalizedCode}` });
            }}
          >
            <Button type="submit" className="w-full">
              Continuar con Google
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-8">
      <div className="w-full rounded-2xl bg-surface p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-monte-soft">
            <Home className="size-6 text-monte" strokeWidth={1.75} />
          </div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Unite a {household.name}</h1>
          <p className="mt-2 text-ink-2">Confirmá para unirte al hogar</p>
        </div>
        <JoinForm code={normalizedCode} />
      </div>
    </div>
  );
}
