import { Linking } from "react-native";
import { ExternalLink } from "lucide-react-native";
import { ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { formatSalidaMeta, pickSalidaLink } from "@/lib/planes-salidas-logic";

import type { RelaxEvent } from "@/hooks/use-relax-suggestions";

export interface SalidasRowProps {
  event: RelaxEvent;
}

/** One Salida row: title, date + venue, external link if the item has one. */
export function SalidasRow({ event }: SalidasRowProps): React.JSX.Element {
  const colors = useThemeColors();
  const link = pickSalidaLink(event);

  return (
    <ListRow
      title={event.title}
      meta={formatSalidaMeta(event)}
      onPress={link ? () => void Linking.openURL(link) : undefined}
      trailing={link ? <ExternalLink size={16} strokeWidth={1.75} color={colors.ink3} /> : undefined}
    />
  );
}
