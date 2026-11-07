import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ListRow } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";

import type { Href } from "expo-router";
import type { LucideIcon } from "lucide-react-native";

export interface InterimMoreLink {
  icon: LucideIcon;
  title: string;
  meta: string;
  href: Href;
}

interface InterimMoreSectionProps {
  links: readonly InterimMoreLink[];
}

/**
 * R3 interim entry points for screens that lived only in the old "Más" menu.
 * Each place stage replaces its section with the real segmented views.
 */
export function InterimMoreSection({ links }: InterimMoreSectionProps): React.JSX.Element {
  const colors = useThemeColors();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.ink3 }]}>Más</Text>
      {links.map((link) => (
        <ListRow key={link.title} icon={link.icon} title={link.title} meta={link.meta} onPress={() => router.push(link.href)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl },
  label: {
    fontFamily: fontFamilyForWeight(600),
    fontSize: 13,
    marginBottom: 4,
    textTransform: "uppercase",
  },
});
