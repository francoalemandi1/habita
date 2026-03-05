import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Dices, RotateCcw, UserPlus } from "lucide-react-native";
import { useRouletteAssign } from "@/hooks/use-roulette";
import { useHouseholdDetail } from "@/hooks/use-households";
import { useMembers } from "@/hooks/use-members";
import { useTasks } from "@/hooks/use-task-management";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useThemeColors } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StyledTextInput } from "@/components/ui/text-input";
import { TabBar } from "@/components/ui/tab-bar";
import { mobileConfig } from "@/lib/config";
import { fontFamily, spacing, typography } from "@/theme";

import type { ThemeColors } from "@/theme";
import type { RouletteAssignResult } from "@/hooks/use-roulette";

// ─── constants ───────────────────────────────────────────────────────────────

const SEGMENT_COLORS = [
  { bg: "#5260fe", text: "#ffffff" },
  { bg: "#fd7c52", text: "#ffffff" },
  { bg: "#7aa649", text: "#ffffff" },
  { bg: "#522a97", text: "#ffffff" },
  { bg: "#f59e0b", text: "#ffffff" },
];

const SLOT_ITEM_H = 64;
const VISIBLE_ITEMS = 3; // items visible in the slot window
const SLOT_HEIGHT = SLOT_ITEM_H * VISIBLE_ITEMS;

// ─── SlotMachine ─────────────────────────────────────────────────────────────

interface SlotMachineProps {
  members: { id: string; name: string }[];
  spinning: boolean;
  winnerId: string | null;
  onSpinComplete: () => void;
}

function SlotMachine({ members, spinning, winnerId, onSpinComplete }: SlotMachineProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Build an extended list for the illusion: repeat members many times
  const extendedList = members.length > 0
    ? Array.from({ length: 40 }, (_, i) => members[i % members.length]!)
    : [];

  const winnerIndex = useRef(0);

  useEffect(() => {
    if (!spinning || members.length === 0) return;

    // Find winner in the extended list (towards the end for dramatic effect)
    const targetMemberIdx = winnerId
      ? members.findIndex((m) => m.id === winnerId)
      : Math.floor(Math.random() * members.length);
    const safeTargetIdx = targetMemberIdx === -1 ? 0 : targetMemberIdx;

    // Land on a position 28–36 items deep so the scroll is long
    const landingOffset = 28 + safeTargetIdx + (members.length * Math.floor(Math.random() * 2));
    winnerIndex.current = landingOffset;

    // Center the winner in the middle slot
    const targetY = -(landingOffset * SLOT_ITEM_H) + SLOT_ITEM_H;

    // Reset to top first (instant), then animate down
    translateY.setValue(0);

    Animated.sequence([
      // Short burst up (slot machine "pull" effect)
      Animated.timing(translateY, {
        toValue: SLOT_ITEM_H * 0.5,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Main spin — fast then decelerates hard
      Animated.timing(translateY, {
        toValue: targetY,
        duration: 2400,
        easing: Easing.bezier(0.1, 0.9, 0.2, 1.0),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Glow + scale pop on the winner cell
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.04, duration: 150, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
      ]).start(() => onSpinComplete());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  const centerColor = SEGMENT_COLORS[
    (winnerIndex.current % members.length) % SEGMENT_COLORS.length
  ] ?? SEGMENT_COLORS[0]!;

  if (members.length === 0) {
    return (
      <View style={styles.slotEmpty}>
        <Text style={styles.slotEmptyText}>Elegí una tarea primero</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.slotOuter, { transform: [{ scale: scaleAnim }] }]}>
      {/* Side gradients for depth */}
      <View style={styles.slotFadeTop} pointerEvents="none" />
      <View style={styles.slotFadeBottom} pointerEvents="none" />

      {/* Center highlight row */}
      <Animated.View
        style={[
          styles.slotHighlight,
          { backgroundColor: centerColor.bg, opacity: spinning ? 0 : glowOpacity },
        ]}
        pointerEvents="none"
      />

      {/* The scrolling strip */}
      <View style={styles.slotWindow}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          {extendedList.map((m, i) => {
            const colorScheme = SEGMENT_COLORS[i % SEGMENT_COLORS.length]!;
            return (
              <View key={`${m.id}-${i}`} style={[styles.slotCell, { backgroundColor: `${colorScheme.bg}18` }]}>
                <View style={[styles.slotDot, { backgroundColor: colorScheme.bg }]}>
                  <Text style={styles.slotDotText}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.slotName} numberOfLines={1}>{m.name.split(" ")[0] ?? m.name}</Text>
              </View>
            );
          })}
        </Animated.View>
      </View>

      {/* Pointer notches */}
      <View style={[styles.pointerLeft, { borderRightColor: colors.primary }]} pointerEvents="none" />
      <View style={[styles.pointerRight, { borderLeftColor: colors.primary }]} pointerEvents="none" />
    </Animated.View>
  );
}

// ─── ResultCard ──────────────────────────────────────────────────────────────

function ResultCard({ result, onReset }: { result: RouletteAssignResult; onReset: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scaleIn = useMemo(() => new Animated.Value(0.7), []);
  const opacityIn = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleIn, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      Animated.timing(opacityIn, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [opacityIn, scaleIn]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleIn }], opacity: opacityIn }}>
      <Card style={styles.resultCard}>
        <CardContent>
          <View style={styles.resultInner}>
            <View style={styles.resultTrophyWrap}>
              <Text style={styles.resultTrophy}>🎉</Text>
            </View>
            <Text style={styles.resultMember}>{result.assignment.member.name}</Text>
            <Text style={styles.resultLabel}>le toca</Text>
            <View style={styles.resultTaskBox}>
              <Text style={styles.resultTask}>{result.taskName}</Text>
            </View>
            <Button variant="outline" onPress={onReset} style={styles.resetButton}>
              <RotateCcw size={14} color={colors.primary} />
              Girar de nuevo
            </Button>
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

type Phase = "idle" | "spinning" | "result";

export default function RouletteScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { me, activeHouseholdId } = useMobileAuth();
  const membersQuery = useMembers();
  const tasksQuery = useTasks();
  const householdQuery = useHouseholdDetail();
  const assignM = useRouletteAssign();

  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [customTask, setCustomTask] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [result, setResult] = useState<RouletteAssignResult | null>(null);

  const members = useMemo(
    () => (membersQuery.data?.members ?? []).filter((m) => m.isActive),
    [membersQuery.data?.members],
  );
  const myMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id;
  const allTasks = tasksQuery.data?.tasks ?? [];

  // Slot members: if a member is pre-selected spin only them (predictable), else spin all
  const slotMembers = selectedMemberId
    ? members.filter((m) => m.id === selectedMemberId)
    : members;

  const headerFadeIn = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(headerFadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [headerFadeIn]);

  const handleSpin = useCallback(() => {
    if (!useCustom && !selectedTaskId) {
      Alert.alert("Falta tarea", "Elegí una tarea del catálogo o escribí una personalizada.");
      return;
    }
    if (useCustom && !customTask.trim()) {
      Alert.alert("Tarea vacía", "Escribí el nombre de la tarea personalizada.");
      return;
    }
    if (members.length < 1) {
      Alert.alert("Sin miembros", "No hay miembros disponibles para asignar.");
      return;
    }

    // Pick a random winner (or use pre-selected member)
    const eligibleMembers = selectedMemberId
      ? members.filter((m) => m.id === selectedMemberId)
      : members;
    const winner = eligibleMembers[Math.floor(Math.random() * eligibleMembers.length)]!;
    setWinnerId(winner.id);
    setPhase("spinning");
  }, [useCustom, selectedTaskId, customTask, members, selectedMemberId]);

  const handleSpinComplete = useCallback(() => {
    if (!winnerId) return;
    const body = useCustom
      ? { memberId: winnerId, customTaskName: customTask.trim() }
      : { memberId: winnerId, taskId: selectedTaskId };

    assignM.mutate(body, {
      onSuccess: (data) => {
        setResult(data);
        setPhase("result");
      },
      onError: (err) => {
        Alert.alert("Error", getMobileErrorMessage(err));
        setPhase("idle");
      },
    });
  }, [winnerId, useCustom, customTask, selectedTaskId, assignM]);

  const handleReset = useCallback(() => {
    setResult(null);
    setWinnerId(null);
    setPhase("idle");
    setSelectedMemberId("");
    setSelectedTaskId("");
    setCustomTask("");
    setUseCustom(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFadeIn }]}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.backTitle, { color: colors.text }]}>Ruleta de tareas</Text>
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.subtitle}>Asigná una tarea al azar, sin debates.</Text>
      </Animated.View>

      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {phase !== "result" ? (
          <>
            {/* ── Task selector ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>¿Qué tarea?</Text>
              <TabBar
                tabs={[{ label: "Del catálogo" }, { label: "Personalizada" }]}
                activeIndex={useCustom ? 1 : 0}
                onTabPress={(i) => { setUseCustom(i === 1); setSelectedTaskId(""); }}
                style={styles.tabBar}
              />
              {useCustom ? (
                <StyledTextInput
                  value={customTask}
                  onChangeText={setCustomTask}
                  placeholder="ej: Limpiar el garage"
                  editable={phase === "idle"}
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.taskScrollContent}
                >
                  {allTasks.slice(0, 20).map((task) => {
                    const isActive = selectedTaskId === task.id;
                    return (
                      <Pressable
                        key={task.id}
                        onPress={() => setSelectedTaskId(task.id)}
                        style={[styles.taskChip, isActive && styles.taskChipActive]}
                        disabled={phase !== "idle"}
                      >
                        <Text
                          style={[styles.taskChipText, isActive && styles.taskChipTextActive]}
                          numberOfLines={1}
                        >
                          {task.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* ── Member filter (optional) ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>¿A quién? <Text style={styles.optionalHint}>(opcional — todos si no elegís)</Text></Text>
              <View style={styles.memberGrid}>
                {members.map((m) => {
                  const isActive = selectedMemberId === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setSelectedMemberId(isActive ? "" : m.id)}
                      style={[styles.memberChip, isActive && styles.memberChipActive]}
                      disabled={phase !== "idle"}
                    >
                      <View style={[styles.memberInitial, { backgroundColor: isActive ? colors.primary : colors.muted }]}>
                        <Text style={[styles.memberInitialText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                          {m.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.memberChipText, isActive && styles.memberChipTextActive]}>
                        {m.name.split(" ")[0] ?? m.name}
                        {m.id === myMemberId ? " (vos)" : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ── Slot machine ── */}
            <View style={styles.slotSection}>
              <SlotMachine
                members={slotMembers}
                spinning={phase === "spinning"}
                winnerId={winnerId}
                onSpinComplete={handleSpinComplete}
              />
            </View>

            {/* ── Spin button ── */}
            <Button
              onPress={handleSpin}
              loading={assignM.isPending || phase === "spinning"}
              disabled={phase === "spinning"}
              style={styles.spinButton}
              size="lg"
            >
              <Dices size={20} color="#ffffff" />
              {phase === "spinning" ? "Girando..." : "Girar la ruleta"}
            </Button>
          </>
        ) : null}

        {/* ── Result ── */}
        {result ? <ResultCard result={result} onReset={handleReset} /> : null}

        {/* ── Solo invite hint (shown after result in a solo household) ── */}
        {result && members.length === 1 ? (
          <View style={styles.soloInviteHint}>
            <UserPlus size={16} color={colors.mutedForeground} />
            <Text style={styles.soloInviteText}>
              La ruleta es más divertida con más personas.{" "}
            </Text>
            <Pressable
              onPress={() => {
                void (async () => {
                  const baseUrl = mobileConfig.oauthBaseUrl;
                  const code = householdQuery.data?.household?.inviteCode ?? "";
                  const inviteUrl = `${baseUrl}/join/${code}`;
                  const houseName = householdQuery.data?.household?.name ?? "mi hogar";
                  const message = `Te invito a unirte a ${houseName} en Habita 🏠\n\n${inviteUrl}`;
                  try { await Share.share({ message }); } catch { /* cancelled */ }
                })();
              }}
            >
              <Text style={styles.soloInviteLink}>¿Invitás a alguien?</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
    backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: "center", justifyContent: "center" },
    backTitle: { ...typography.cardTitle },
    subtitle: { fontFamily: fontFamily.sans, fontSize: 14, color: c.mutedForeground },
    scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24 },

    section: { marginBottom: spacing.lg },
    sectionLabel: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "600", color: c.text, marginBottom: spacing.sm },
    optionalHint: { fontFamily: fontFamily.sans, fontWeight: "400", color: c.mutedForeground },
    tabBar: { marginBottom: spacing.sm },

    taskScrollContent: { gap: spacing.sm },
    taskChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card, minWidth: 140 },
    taskChipActive: { borderColor: c.primary, backgroundColor: c.primaryLight },
    taskChipText: { fontFamily: fontFamily.sans, fontWeight: "500", color: c.text, fontSize: 13 },
    taskChipTextActive: { fontWeight: "700", color: c.primary },

    memberGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    memberChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card },
    memberChipActive: { borderColor: c.primary, backgroundColor: c.primaryLight },
    memberInitial: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    memberInitialText: { fontFamily: fontFamily.sans, fontSize: 11, fontWeight: "700" },
    memberChipText: { fontFamily: fontFamily.sans, fontWeight: "500", color: c.text, fontSize: 13 },
    memberChipTextActive: { color: c.primary, fontWeight: "700" },

    // Slot machine
    slotSection: { alignItems: "center", marginBottom: spacing.lg },
    slotOuter: {
      width: Math.min(SCREEN_W - spacing.lg * 2, 320),
      height: SLOT_HEIGHT,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: `${c.primary}40`,
      overflow: "hidden",
      backgroundColor: c.card,
      position: "relative",
    },
    slotWindow: { overflow: "hidden", height: SLOT_HEIGHT },
    slotCell: {
      height: SLOT_ITEM_H,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: `${c.border}60`,
    },
    slotDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    slotDotText: { fontFamily: fontFamily.sans, fontSize: 16, fontWeight: "800", color: "#ffffff" },
    slotName: { fontFamily: fontFamily.sans, fontSize: 18, fontWeight: "700", color: c.text, flex: 1 },
    slotHighlight: {
      position: "absolute",
      top: SLOT_ITEM_H,
      left: 0,
      right: 0,
      height: SLOT_ITEM_H,
      zIndex: 1,
    },
    slotFadeTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: SLOT_ITEM_H,
      backgroundColor: `${c.background}CC`,
      zIndex: 2,
    },
    slotFadeBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: SLOT_ITEM_H,
      backgroundColor: `${c.background}CC`,
      zIndex: 2,
    },
    pointerLeft: {
      position: "absolute",
      left: 0,
      top: SLOT_ITEM_H + (SLOT_ITEM_H / 2) - 8,
      width: 0,
      height: 0,
      borderTopWidth: 8,
      borderBottomWidth: 8,
      borderRightWidth: 12,
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
      zIndex: 3,
    },
    pointerRight: {
      position: "absolute",
      right: 0,
      top: SLOT_ITEM_H + (SLOT_ITEM_H / 2) - 8,
      width: 0,
      height: 0,
      borderTopWidth: 8,
      borderBottomWidth: 8,
      borderLeftWidth: 12,
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
      zIndex: 3,
    },
    slotEmpty: { height: SLOT_HEIGHT, alignItems: "center", justifyContent: "center", backgroundColor: c.card, borderRadius: 20, borderWidth: 2, borderColor: c.border, borderStyle: "dashed" },
    slotEmptyText: { fontFamily: fontFamily.sans, fontSize: 14, color: c.mutedForeground, textAlign: "center", paddingHorizontal: spacing.lg },

    spinButton: { width: "100%", marginBottom: spacing.lg },

    // Result
    resultCard: { borderColor: `${c.primary}30`, backgroundColor: `${c.primary}06` },
    resultInner: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
    resultTrophyWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${c.primary}15`, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
    resultTrophy: { fontSize: 36 },
    resultMember: { fontFamily: fontFamily.sans, fontSize: 22, fontWeight: "800", color: c.text, textAlign: "center" },
    resultLabel: { fontFamily: fontFamily.sans, fontSize: 14, color: c.mutedForeground },
    resultTaskBox: { backgroundColor: c.muted, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: c.border, marginTop: spacing.xs },
    resultTask: { fontFamily: fontFamily.sans, fontSize: 16, fontWeight: "700", color: c.text, textAlign: "center" },
    resetButton: { marginTop: spacing.sm, width: "100%" },

    soloInviteHint: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
      backgroundColor: `${c.muted}99`,
      borderRadius: 12,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    soloInviteText: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.mutedForeground,
      flex: 1,
      flexShrink: 1,
    },
    soloInviteLink: {
      fontFamily: fontFamily.sans,
      fontSize: 13,
      color: c.primary,
      fontWeight: "600" as const,
      textDecorationLine: "underline" as const,
    },

    bottomPad: { height: 40 },
  });
}
