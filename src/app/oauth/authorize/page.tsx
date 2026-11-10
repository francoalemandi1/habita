import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { HabitaLogo } from "@/components/ds";
import { validateAuthorizeRequest } from "@/lib/mcp/oauth/authorize-request";
import { getRedirectHost } from "@/lib/mcp/oauth/redirect-uri";
import { AuthorizeConsentActions } from "@/components/features/oauth/authorize-consent-actions";

interface AuthorizePageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function ErrorCard({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-monte px-6 py-12 text-center">
      <HabitaLogo size={56} />
      <h1 className="text-[28px] font-bold leading-tight text-paper">No pudimos conectar la app</h1>
      <p className="max-w-sm text-[15px] text-paper/80">{message}</p>
    </div>
  );
}

export default async function AuthorizePage({ searchParams }: AuthorizePageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    const originalQuery = new URLSearchParams(params as Record<string, string>).toString();
    const callbackPath = `/oauth/authorize?${originalQuery}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const result = await validateAuthorizeRequest(params);

  if (result.kind === "fatal") {
    return <ErrorCard message={result.message} />;
  }

  if (result.kind === "redirect-error") {
    redirect(result.redirectUrl);
  }

  const clientName = result.client.clientName ?? getRedirectHost(result.redirectUri);
  const requestedScopes = result.scope.split(" ");
  const includesHabita = requestedScopes.includes("habita");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-monte px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <HabitaLogo size={56} />

        <h1 className="text-[28px] font-bold leading-tight text-paper">
          Conectar {clientName} con Ahorrá
        </h1>

        <p className="text-[15px] text-paper/80">
          {clientName} va a poder buscar precios y comparar tu changuito usando tu cuenta de Habita (
          {session.user.email}).{" "}
          {includesHabita ? "También va a poder ver y editar tu hogar (tareas, lista de compras, gastos), pero nunca va a poder borrar nada." : "No ve tus tareas ni tus gastos."}
        </p>
      </div>

      <div className="w-full max-w-sm">
        <AuthorizeConsentActions params={params} />
      </div>
    </div>
  );
}
