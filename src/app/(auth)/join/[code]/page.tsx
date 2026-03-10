import { headers } from "next/headers";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
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
      <div className="rounded-2xl border-2 border-border/60 bg-card p-6 shadow-lg sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 text-4xl">
            ✕
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Código inválido</h1>
          <p className="mt-muted-foreground mt-2">
            El link de invitación no es válido o ya no está disponible.
          </p>
        </div>
      </div>
    );
  }

  // Mobile: try to open the app via universal link, fallback to store
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
      <div className="rounded-2xl border-2 border-border/60 bg-card p-6 shadow-lg sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4">
            <HabitaLogo size={64} className="rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Unite a {household.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Te invitaron a formar parte de este hogar en Habita
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: `/join/${normalizedCode}` });
          }}
        >
          <Button type="submit" className="w-full" size="lg">
            Continuar con Google
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-border/60 bg-card p-6 shadow-lg sm:p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-4xl">
          🏠
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Unite a {household.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ingresá tu nombre para unirte al hogar
        </p>
      </div>

      <JoinForm
        code={normalizedCode}
        householdName={household.name}
        userName={session.user.name ?? ""}
      />
    </div>
  );
}
