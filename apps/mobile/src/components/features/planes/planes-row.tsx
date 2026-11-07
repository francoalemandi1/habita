import { Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import {
  Baby,
  BookOpen,
  Bookmark,
  BookmarkCheck,
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
} from "lucide-react-native";
import { ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { formatPlanRowMeta } from "@/lib/planes-logic";

import type { LucideIcon } from "lucide-react-native";
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

/** One plan row: category icon, title, date + venue, save toggle. Pushes the plan detail. */
export function PlanesRow({ event, isSaved, isSavePending, onToggleSave, now }: PlanesRowProps): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <ListRow
      icon={CATEGORY_ICONS[event.category]}
      title={event.title}
      meta={formatPlanRowMeta(event, now)}
      onPress={() => router.push({ pathname: "/(app)/casa/planes/[id]", params: { id: event.id } })}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isSaved ? "Quitar de guardados" : "Guardar"}
          hitSlop={8}
          disabled={isSavePending}
          onPress={onToggleSave}
          style={styles.saveButton}
        >
          {isSaved ? (
            <BookmarkCheck size={18} strokeWidth={1.75} color={colors.monte} />
          ) : (
            <Bookmark size={18} strokeWidth={1.75} color={colors.ink3} />
          )}
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  saveButton: {
    padding: 4,
  },
});
