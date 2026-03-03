import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useMembers } from "@/hooks/use-members";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { useCreateAssignment, useCreateTask } from "@/hooks/use-task-management";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StyledTextInput } from "@/components/ui/text-input";
import { colors, fontFamily, spacing, typography } from "@/theme";
import type { TaskFrequency } from "@habita/contracts";

const FREQUENCY_OPTIONS: Array<{ label: string; value: TaskFrequency }> = [
  { label: "Diaria", value: "DAILY" }, { label: "Semanal", value: "WEEKLY" },
  { label: "Quincenal", value: "BIWEEKLY" }, { label: "Mensual", value: "MONTHLY" }, { label: "Una vez", value: "ONCE" },
];

function todayIsoDate(): string { return new Date().toISOString().slice(0, 10); }

function dueDateToIsoStartOfDay(dateValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const parsed = new Date(`${dateValue}T09:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default function NewTaskScreen() {
  const membersQuery = useMembers();
  const createTask = useCreateTask();
  const createAssignment = useCreateAssignment();
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("1");
  const [frequency, setFrequency] = useState<TaskFrequency>("WEEKLY");
  const [dueDate, setDueDate] = useState(todayIsoDate());
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const members = membersQuery.data?.members ?? [];
  const isSubmitting = createTask.isPending || createAssignment.isPending;
  const canSubmit = useMemo(() => taskName.trim().length >= 2 && selectedMemberId.length > 0 && !isSubmitting, [taskName, selectedMemberId, isSubmitting]);

  const handleSubmit = async () => {
    setError(null);
    const parsedWeight = Number.parseInt(weight, 10);
    const taskWeight = Number.isFinite(parsedWeight) ? parsedWeight : 1;
    if (taskWeight < 1 || taskWeight > 5) { setError("El peso debe estar entre 1 y 5."); return; }
    const dueDateIso = dueDateToIsoStartOfDay(dueDate);
    if (!dueDateIso) { setError("Usá fecha con formato YYYY-MM-DD."); return; }
    if (!selectedMemberId) { setError("Seleccioná a quién asignar la tarea."); return; }
    try {
      const createdTask = await createTask.mutateAsync({ name: taskName.trim(), description: description.trim() || undefined, frequency, weight: taskWeight, isRouletteEligible: false });
      await createAssignment.mutateAsync({ taskId: createdTask.task.id, memberId: selectedMemberId, dueDate: dueDateIso });
      router.replace("/(app)/tasks");
    } catch (submitError) { setError(getMobileErrorMessage(submitError)); }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.backRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.backTitle}>Nueva tarea</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Creá y asigná una tarea en un solo paso.</Text>
        <Card style={styles.card}>
          <CardContent>
            <StyledTextInput label="Nombre" placeholder="Nombre de la tarea" value={taskName} onChangeText={setTaskName} style={styles.field} />
            <StyledTextInput label="Descripción (opcional)" placeholder="Descripción breve" value={description} onChangeText={setDescription} style={styles.field} />
            <StyledTextInput label="Peso (1-5)" placeholder="1" value={weight} onChangeText={setWeight} keyboardType="number-pad" style={styles.field} />
            <StyledTextInput label="Vencimiento (YYYY-MM-DD)" placeholder={todayIsoDate()} value={dueDate} onChangeText={setDueDate} autoCapitalize="none" style={styles.field} />
            <Text style={styles.sectionLabel}>Frecuencia</Text>
            <View style={styles.freqRow}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <Pressable key={opt.value} onPress={() => setFrequency(opt.value)} style={[styles.freqChip, frequency === opt.value && styles.freqChipActive]}>
                  <Text style={[styles.freqText, frequency === opt.value && styles.freqTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Asignar a</Text>
            {membersQuery.isLoading ? <Text style={styles.loadingText}>Cargando miembros...</Text> : null}
            {members.map((member) => (
              <Pressable key={member.id} onPress={() => setSelectedMemberId(member.id)} style={[styles.memberRow, member.id === selectedMemberId && styles.memberRowActive]}>
                <Text style={[styles.memberName, member.id === selectedMemberId && styles.memberNameActive]}>{member.name}</Text>
              </Pressable>
            ))}
          </CardContent>
        </Card>
        {error ? <Card style={styles.errorCard}><CardContent><Text style={styles.errorText}>{error}</Text></CardContent></Card> : null}
        <Button onPress={() => void handleSubmit()} disabled={!canSubmit} loading={isSubmitting}>Crear y asignar tarea</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  backTitle: { ...typography.cardTitle },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 24 },
  subtitle: { fontFamily: fontFamily.sans, fontSize: 13, color: colors.mutedForeground, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  sectionLabel: { fontFamily: fontFamily.sans, fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: spacing.sm },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  freqChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  freqChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  freqText: { fontFamily: fontFamily.sans, color: colors.text, fontWeight: "500", fontSize: 12 },
  freqTextActive: { color: colors.primary, fontWeight: "700" },
  memberRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: spacing.sm, backgroundColor: colors.card },
  memberRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  memberName: { color: colors.text, fontWeight: "500" },
  memberNameActive: { color: colors.primary, fontWeight: "700" },
  loadingText: { color: colors.mutedForeground, marginBottom: spacing.sm },
  errorCard: { backgroundColor: colors.errorBg, marginBottom: spacing.md },
  errorText: { fontFamily: fontFamily.sans, color: colors.errorText, fontSize: 14 },
});
