import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { PenLine, Send, X } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { mobileApi } from "@/lib/api";
import { fontFamily, radius, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";

interface ParseExpenseResponse {
  title: string;
  amount: number;
  category: string;
  notes?: string;
}

export function QuickExpenseInput() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function expand() {
    setExpanded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      inputRef.current?.focus();
    });
  }

  function collapse() {
    Keyboard.dismiss();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setExpanded(false);
      setText("");
    });
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    Keyboard.dismiss();

    try {
      const result = await mobileApi.post<ParseExpenseResponse>("/api/ai/parse-expense", {
        text: trimmed,
      });

      collapse();

      // Navigate to new-expense with pre-filled params
      router.push({
        pathname: "/(app)/new-expense",
        params: {
          prefillTitle: result.title,
          prefillAmount: String(result.amount),
          prefillCategory: result.category,
          ...(result.notes ? { prefillNotes: result.notes } : {}),
        },
      });
    } catch {
      // On parse failure: open new-expense empty (or with text as notes)
      collapse();
      router.push({
        pathname: "/(app)/new-expense",
        params: { prefillNotes: trimmed },
      });
    } finally {
      setLoading(false);
    }
  }

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.pill} onPress={expand} activeOpacity={0.8}>
        <PenLine size={15} color={colors.primary} />
        <Text style={styles.pillText}>Registrar gasto rápido</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.inputCard, { opacity: fadeAnim }]}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Ej: Gasté 1500 en el super"
        placeholderTextColor={colors.mutedForeground}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
        autoCorrect={false}
        maxLength={200}
      />
      <View style={styles.actions}>
        <TouchableOpacity onPress={collapse} style={styles.iconBtn}>
          <X size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.iconBtn, styles.sendBtn]}
          disabled={!text.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Send size={16} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      alignSelf: "center",
      backgroundColor: c.primaryLight,
      borderRadius: radius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    pillText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      fontWeight: "500",
      color: c.primary,
    },
    inputCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: c.primary,
    },
    input: {
      flex: 1,
      fontFamily: fontFamily.sans,
      fontSize: 14,
      color: c.text,
      paddingVertical: 6,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtn: {
      backgroundColor: c.primary,
    },
  });
}
