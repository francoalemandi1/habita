"use client";

import { useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/ds/screen-header";
import { APP_ROUTES } from "@habita/contracts";

interface TareasDetailHeaderProps {
  title: string;
  backLabel?: string;
  backHref?: string;
}

/** `ScreenHeader` is a client component — server route pages can't hand it an inline `onBack`. */
export function TareasDetailHeader({ title, backLabel = "Tareas", backHref = APP_ROUTES.tareas }: TareasDetailHeaderProps): React.JSX.Element {
  const router = useRouter();
  return <ScreenHeader variant="detail" title={title} backLabel={backLabel} onBack={() => router.push(backHref)} />;
}
