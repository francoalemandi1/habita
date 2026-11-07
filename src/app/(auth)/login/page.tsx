import { signIn } from "@/lib/auth";
import { Button } from "@/components/ds";
import { HabitaLogo } from "@/components/ui/habita-logo";
import { BienvenidaBullets } from "@/components/features/onboarding/bienvenida-bullets";
import { APP_ROUTES } from "@habita/contracts";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

/** Bienvenida — handoff §5.3 Entrada. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl?.startsWith("/") ? callbackUrl : APP_ROUTES.casa;
  const joinRedirectTo = "/onboarding?mode=join";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-monte px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <HabitaLogo size={72} />

        <h1 className="text-[56px] font-bold leading-[0.95] tracking-[-0.04em] text-paper">
          La casa, en orden.
        </h1>

        <BienvenidaBullets />
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
          className="w-full"
        >
          <Button type="submit" size="default" className="w-full bg-paper text-ink hover:bg-paper">
            Continuar con Google
          </Button>
        </form>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: joinRedirectTo });
          }}
        >
          <button type="submit" className="text-[15px] font-medium text-paper underline underline-offset-[3px]">
            Tengo un código de invitación
          </button>
        </form>
      </div>
    </div>
  );
}
