import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useApplyWeeklyPlan,
  useDiscardWeeklyPlan,
  usePlanAssignmentEdit,
  usePlanFeedback,
  usePreviewWeeklyPlan,
} from "@/hooks/use-weekly-plan";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { PlanAssignment, PlanPreviewResponse } from "@habita/contracts";

function getDefaultRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const end = new Date(now);
  end.setDate(now.getDate() + 6);
  const endDate = end.toISOString().slice(0, 10);
  return { startDate, endDate };
}

interface ReassignModalProps {
  planId: string;
  assignment: PlanAssignment & { id?: string };
  members: PlanPreviewResponse["members"];
  onClose: () => void;
}

function ReassignModal({ planId, assignment, members, onClose }: ReassignModalProps) {
  const editPlan = usePlanAssignmentEdit();
  const [selectedMemberId, setSelectedMemberId] = useState(assignment.memberId);
  const [error, setError] = useState<string | null>(null);

  const handleReassign = async () => {
    if (!assignment.id || selectedMemberId === assignment.memberId) {
      onClose();
      return;
    }
    setError(null);
    try {
      await editPlan.mutateAsync({
        planId,
        action: "reassign",
        assignmentId: assignment.id,
        newMemberId: selectedMemberId,
      });
      onClose();
    } catch (err) {
      setError(getMobileErrorMessage(err));
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111111" }}>
            Reasignar: {assignment.taskName}
          </Text>

          {members.map((member) => {
            const isSelected = member.id === selectedMemberId;
            return (
              <Pressable
                key={member.id}
                onPress={() => setSelectedMemberId(member.id)}
                style={{
                  borderWidth: 1,
                  borderColor: isSelected ? semanticColors.primary : "#e5e7eb",
                  backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: "#111111", fontWeight: isSelected ? "700" : "500" }}>
                  {member.name}
                </Text>
                <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                  {member.assignedInPlan} en plan
                </Text>
              </Pressable>
            );
          })}

          {error ? <Text style={{ color: "#b91c1c", fontSize: 13 }}>{error}</Text> : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: "#f3f4f6",
              }}
            >
              <Text style={{ fontWeight: "600", color: "#374151" }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleReassign()}
              disabled={editPlan.isPending}
              style={{
                flex: 2,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: semanticColors.primary,
                opacity: editPlan.isPending ? 0.6 : 1,
              }}
            >
              {editPlan.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Reasignar</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface FeedbackSectionProps {
  planId: string;
}

function FeedbackSection({ planId }: FeedbackSectionProps) {
  const feedbackMutation = usePlanFeedback();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <View
        style={{
          borderWidth: 1,
          borderColor: "#bbf7d0",
          borderRadius: 12,
          padding: 14,
          backgroundColor: "#f0fdf4",
        }}
      >
        <Text style={{ color: "#166534", fontWeight: "700" }}>¡Gracias por tu feedback!</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 14,
        gap: 10,
      }}
    >
      <Text style={{ fontWeight: "700", color: "#111111" }}>¿Cómo fue el plan?</Text>

      <View style={{ flexDirection: "row", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)}>
            <Text style={{ fontSize: 26 }}>{star <= rating ? "⭐" : "☆"}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Comentario opcional..."
        placeholderTextColor="#9ca3af"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#e5e7eb",
          borderRadius: 8,
          padding: 10,
          fontSize: 14,
          color: "#111111",
          minHeight: 50,
        }}
      />

      {error ? <Text style={{ color: "#b91c1c", fontSize: 13 }}>{error}</Text> : null}

      <Pressable
        onPress={async () => {
          if (!rating) {
            setError("Seleccioná una calificación.");
            return;
          }
          setError(null);
          try {
            await feedbackMutation.mutateAsync({
              planId,
              rating,
              comment: comment.trim() || undefined,
            });
            setSent(true);
          } catch (err) {
            setError(getMobileErrorMessage(err));
          }
        }}
        disabled={!rating || feedbackMutation.isPending}
        style={{
          borderRadius: 10,
          paddingVertical: 10,
          alignItems: "center",
          backgroundColor: semanticColors.primary,
          opacity: !rating || feedbackMutation.isPending ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "700" }}>
          {feedbackMutation.isPending ? "Enviando..." : "Enviar feedback"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function WeeklyPlanScreen() {
  const defaults = useMemo(() => getDefaultRange(), []);
  const previewPlan = usePreviewWeeklyPlan();
  const applyPlan = useApplyWeeklyPlan();
  const discardPlan = useDiscardWeeklyPlan();

  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [appliedPlanId, setAppliedPlanId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<(PlanAssignment & { id?: string }) | null>(
    null,
  );

  const plan = previewPlan.data?.plan;
  const planMembers = previewPlan.data?.members ?? [];

  const handlePreview = async () => {
    setError(null);
    setSuccessMessage(null);
    setAppliedPlanId(null);
    try {
      await previewPlan.mutateAsync({
        startDate: `${startDate}T00:00:00.000Z`,
        endDate: `${endDate}T00:00:00.000Z`,
      });
    } catch (previewError) {
      setError(getMobileErrorMessage(previewError));
    }
  };

  const handleApply = async () => {
    if (!plan) return;
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await applyPlan.mutateAsync({
        planId: plan.id,
        assignments: plan.assignments,
      });
      setAppliedPlanId(plan.id);
      setSuccessMessage(
        `Plan aplicado: ${result.assignmentsCreated} tareas creadas` +
          (result.assignmentsCancelled ? `, ${result.assignmentsCancelled} canceladas` : ""),
      );
    } catch (applyError) {
      setError(getMobileErrorMessage(applyError));
    }
  };

  const handleDiscard = async () => {
    if (!plan) return;
    setError(null);
    setSuccessMessage(null);
    try {
      await discardPlan.mutateAsync(plan.id);
      setSuccessMessage("Plan descartado.");
    } catch (discardError) {
      setError(getMobileErrorMessage(discardError));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <ScrollView>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>Plan semanal AI</Text>
        <Text style={{ marginTop: 4, color: "#6b7280" }}>Generá, revisá y aplicá tu plan semanal.</Text>

        <View style={{ marginTop: 12, gap: 8 }}>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="Inicio (YYYY-MM-DD)"
            style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
          />
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            placeholder="Fin (YYYY-MM-DD)"
            style={{ borderWidth: 1, borderColor: "#dddddd", borderRadius: 10, padding: 12 }}
          />
          <Pressable
            onPress={() => void handlePreview()}
            style={{
              borderRadius: 10,
              backgroundColor: semanticColors.primary,
              padding: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>
              {previewPlan.isPending ? "Generando..." : "Generar preview"}
            </Text>
          </Pressable>
        </View>

        {error ? <Text style={{ marginTop: 10, color: "#b91c1c" }}>{error}</Text> : null}
        {successMessage ? (
          <Text style={{ marginTop: 10, color: "#166534" }}>{successMessage}</Text>
        ) : null}

        {appliedPlanId ? (
          <View style={{ marginTop: 16 }}>
            <FeedbackSection planId={appliedPlanId} />
          </View>
        ) : null}

        {plan && !appliedPlanId ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}>
              <Text style={{ fontWeight: "700" }}>Balance score: {plan.balanceScore}</Text>
              <Text style={{ marginTop: 4, color: "#6b7280" }}>
                {plan.durationDays} días · {plan.assignments.length} asignaciones
              </Text>
            </View>

            {plan.notes.length ? (
              <View
                style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}
              >
                <Text style={{ fontWeight: "700" }}>Notas</Text>
                {plan.notes.map((note) => (
                  <Text key={note} style={{ marginTop: 4, color: "#374151" }}>
                    - {note}
                  </Text>
                ))}
              </View>
            ) : null}

            <View
              style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12 }}
            >
              <Text style={{ fontWeight: "700", marginBottom: 8 }}>Asignaciones</Text>
              {plan.assignments.map((assignment, index) => (
                <View
                  key={`${assignment.taskName}-${assignment.memberId}-${index}`}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 7,
                    borderBottomWidth: index < plan.assignments.length - 1 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600", color: "#111111" }}>
                      {assignment.taskName}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>
                      {assignment.memberName}
                      {assignment.dayOfWeek ? ` · Día ${assignment.dayOfWeek}` : ""}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setReassignTarget(assignment)}
                    style={{
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: "#f3f4f6",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#374151", fontWeight: "600" }}>
                      Reasignar
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => void handleApply()}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  backgroundColor: "#166534",
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                  {applyPlan.isPending ? "Aplicando..." : "Aplicar plan"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleDiscard()}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  backgroundColor: "#f3f4f6",
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#111111", fontWeight: "700" }}>
                  {discardPlan.isPending ? "Descartando..." : "Descartar"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {reassignTarget && plan ? (
        <ReassignModal
          planId={plan.id}
          assignment={reassignTarget}
          members={planMembers}
          onClose={() => setReassignTarget(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
