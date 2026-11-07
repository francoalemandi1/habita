import Link from "next/link";
import {
  Baby,
  BookOpen,
  Compass,
  Drama,
  Dumbbell,
  Film,
  Footprints,
  GraduationCap,
  Mountain,
  Music,
  Palette,
  PartyPopper,
  Store,
  Tag as TagIcon,
  UtensilsCrossed,
} from "lucide-react";
import { ListRow } from "@/components/ds/list-row";
import { SaveButton } from "@/components/ds/save-button";
import { formatPlanRowMeta } from "@/lib/planes-logic";

import type { LucideIcon } from "lucide-react";
import type { EventCategory, EventItem } from "@habita/contracts";

const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  CINE: Film,
  TEATRO: Drama,
  MUSICA: Music,
  DANZA: Footprints,
  EXPOSICIONES: Palette,
  FESTIVALES: PartyPopper,
  TALLERES: GraduationCap,
  LITERATURA: BookOpen,
  GASTRONOMIA: UtensilsCrossed,
  DEPORTES: Dumbbell,
  INFANTIL: Baby,
  MERCADOS: Store,
  PASEOS: Compass,
  EXCURSIONES: Mountain,
  OTRO: TagIcon,
};

export interface PlanesRowProps {
  event: EventItem;
  isSaved: boolean;
  isSavePending: boolean;
  onToggleSave: () => void;
  now: Date;
}

/** One plan row: category icon, title, date + venue, save toggle. Opens the plan detail. */
export function PlanesRow({ event, isSaved, isSavePending, onToggleSave, now }: PlanesRowProps): React.JSX.Element {
  return (
    <Link href={`/casa/planes/${event.id}`} className="block">
      <ListRow
        leadingIcon={CATEGORY_ICONS[event.category]}
        title={event.title}
        meta={formatPlanRowMeta(event, now)}
        trailing={
          <SaveButton isSaved={isSaved} isPending={isSavePending} onToggle={onToggleSave} />
        }
      />
    </Link>
  );
}
