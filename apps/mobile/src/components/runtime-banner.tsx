import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { subscribeRuntimeEvents } from "@/lib/runtime-events";
import { useThemeColors } from "@/hooks/use-theme";

interface BannerState {
  type: "network-error" | "auth-expired";
  message: string;
}

export function RuntimeBanner() {
  const [banner, setBanner] = useState<BannerState | null>(null);
  const c = useThemeColors();

  useEffect(() => {
    return subscribeRuntimeEvents((event) => {
      setBanner({
        type: event.type,
        message: event.message,
      });
    });
  }, []);

  useEffect(() => {
    if (!banner || banner.type !== "network-error") {
      return;
    }

    const timeoutId = setTimeout(() => {
      setBanner((current) => (current?.type === "network-error" ? null : current));
    }, 4500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [banner]);

  if (!banner) {
    return null;
  }

  const backgroundColor = banner.type === "auth-expired" ? c.warningBg : c.errorBg;
  const textColor = banner.type === "auth-expired" ? c.warningText : c.errorText;

  return (
    <View
      style={{
        position: "absolute",
        top: 8,
        left: 12,
        right: 12,
        zIndex: 50,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Text style={{ color: textColor, flex: 1, fontWeight: "600", fontSize: 12 }}>{banner.message}</Text>
        <Pressable onPress={() => setBanner(null)}>
          <Text style={{ color: textColor, fontWeight: "700" }}>Cerrar</Text>
        </Pressable>
      </View>
    </View>
  );
}
