import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { JoinForm } from "./join-form";

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

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
          <p className="mt-2 text-muted-foreground">
            El link de invitación no es válido o ya no está disponible.
          </p>
        </div>
      </div>
    );
  }

  const session = await auth();

  if (!session?.user) {
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
