import { ExternalLink } from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { formatSalidaMeta, pickSalidaLink } from "@/lib/planes-salidas-logic";

import type { RelaxEvent } from "@/lib/events/types";

export interface SalidasRowProps {
  event: RelaxEvent;
}

/** One Salida row: title, date + venue, external link if the item has one. */
export function SalidasRow({ event }: SalidasRowProps): React.JSX.Element {
  const link = pickSalidaLink(event);
  const row = (
    <ListRow
      title={event.title}
      meta={formatSalidaMeta(event)}
      trailing={link ? <ExternalLink className="size-4 text-ink-3" strokeWidth={1.75} /> : undefined}
    />
  );

  if (!link) return row;

  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="block">
      {row}
    </a>
  );
}
