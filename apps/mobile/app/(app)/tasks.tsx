import { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useCompleteAssignment,
  useMyAssignments,
  useUncompleteAssignment,
  useVerifyAssignment,
} from "@/hooks/use-assignments";
import { useCreateTransfer } from "@/hooks/use-transfers";
import { useMembers } from "@/hooks/use-members";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

import type { AssignmentSummary } from "@habita/contracts";

function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function isCompletedStatus(status: AssignmentSummary["status"]): boolean {
  return status === "COMPLETED" || status === "VERIFIED";
}

function dayKey(dateValue: string | Date): string {
  const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface VerifyModalProps {
  assignment: AssignmentSummary;
  onClose: () => void;
  onConfirm: (approved: boolean, feedback: string) => void;
  isPending: boolean;
}

function VerifyModal({ assignment, onClose, onConfirm, isPending }: VerifyModalProps) {
  const [feedback, setFeedback] = useState("");

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
            gap: 16,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111111" }}>
            Verificar: {assignment.task.name}
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>
            ¿Aprobás la tarea completada por este miembro?
          </Text>

          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Feedback opcional..."
            placeholderTextColor="#9ca3af"
            multiline
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              padding: 10,
              fontSize: 14,
              color: "#111111",
              minHeight: 60,
            }}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => onConfirm(false, feedback)}
              disabled={isPending}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: "#fee2e2",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#b91c1c", fontWeight: "700" }}>Rechazar</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(true, feedback)}
              disabled={isPending}
              style={{
                flex: 1,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: "#dcfce7",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#16a34a", fontWeight: "700" }}>Aprobar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface TransferModalProps {
  assignment: AssignmentSummary;
  onClose: () => void;
}

function TransferModal({ assignment, onClose }: TransferModalProps) {
  const membersQuery = useMembers();
  const createTransfer = useCreateTransfer();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const members = (membersQuery.data?.members ?? []).filter((m) => m.id !== assignment.memberId);

  const handleSend = async () => {
    setError(null);
    if (!selectedMemberId) {
      setError("Seleccioná a quién transferir.");
      return;
    }
    try {
      await createTransfer.mutateAsync({
        assignmentId: assignment.id,
        toMemberId: selectedMemberId,
        reason: reason.trim() || undefined,
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
            Transferir: {assignment.task.name}
          </Text>

          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "600", color: "#374151", fontSize: 14 }}>Transferir a</Text>
            {membersQuery.isLoading ? (
              <Text style={{ color: "#6b7280" }}>Cargando...</Text>
            ) : members.length === 0 ? (
              <Text style={{ color: "#6b7280" }}>No hay otros miembros disponibles.</Text>
            ) : (
              members.map((member) => {
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
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={{ color: "#111111", fontWeight: isSelected ? "700" : "500" }}>
                      {member.name}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Motivo (opcional)"
            placeholderTextColor="#9ca3af"
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 10,
              padding: 10,
              fontSize: 14,
              color: "#111111",
            }}
          />

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
              onPress={() => void handleSend()}
              disabled={!selectedMemberId || createTransfer.isPending}
              style={{
                flex: 2,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                backgroundColor: semanticColors.primary,
                opacity: !selectedMemberId || createTransfer.isPending ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                {createTransfer.isPending ? "Enviando..." : "Enviar solicitud"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface AssignmentCardProps {
  assignment: AssignmentSummary;
  onComplete: () => void;
  onUncomplete: () => void;
  onVerify: () => void;
  onTransfer: () => void;
  isMutating: boolean;
  canVerify: boolean;
}

type TasksFilter = "all" | "pending" | "completed";

const FILTERS: Array<{ id: TasksFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "pending", label: "Pendientes" },
  { id: "completed", label: "Completadas" },
];

function AssignmentCard({
  assignment,
  onComplete,
  onUncomplete,
  onVerify,
  onTransfer,
  isMutating,
  canVerify,
}: AssignmentCardProps) {
  const isCompleted = isCompletedStatus(assignment.status);
  const isVerified = assignment.status === "VERIFIED";
  const awaitingVerify = assignment.status === "COMPLETED" && canVerify;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        backgroundColor: isCompleted ? "#f9fafb" : "#ffffff",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={{ fontWeight: "700", color: "#111111" }}>{assignment.task.name}</Text>
          <Text style={{ marginTop: 2, color: "#6b7280", fontSize: 12 }}>
            Vence: {formatDueDate(assignment.dueDate)} ·{" "}
            {isVerified ? "✓ Verificada" : isCompleted ? "Completada" : assignment.status}
          </Text>
          {assignment.task.description ? (
            <Text style={{ marginTop: 6, color: "#4b5563", fontSize: 12 }}>
              {assignment.task.description}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 6, alignItems: "flex-end" }}>
          <Pressable
            disabled={isMutating}
            onPress={isCompleted ? onUncomplete : onComplete}
            style={{
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
              backgroundColor: isCompleted ? "#e5e7eb" : semanticColors.primary,
              opacity: isMutating ? 0.7 : 1,
            }}
          >
            <Text style={{ color: isCompleted ? "#111111" : "#ffffff", fontWeight: "700", fontSize: 12 }}>
              {isMutating ? "Guardando..." : isCompleted ? "Desmarcar" : "Completar"}
            </Text>
          </Pressable>

          {awaitingVerify ? (
            <Pressable
              disabled={isMutating}
              onPress={onVerify}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: "#fef9c3",
                opacity: isMutating ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "#854d0e", fontWeight: "700", fontSize: 12 }}>Verificar</Text>
            </Pressable>
          ) : null}

          {!isCompleted ? (
            <Pressable
              disabled={isMutating}
              onPress={onTransfer}
              style={{
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: "#f3f4f6",
                opacity: isMutating ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "#374151", fontWeight: "600", fontSize: 12 }}>Transferir</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const { me } = useMobileAuth();
  const { data, isLoading, isError, error, refetch } = useMyAssignments();
  const completeMutation = useCompleteAssignment();
  const uncompleteMutation = useUncompleteAssignment();
  const verifyMutation = useVerifyAssignment();
  const [activeFilter, setActiveFilter] = useState<TasksFilter>("all");
  const [verifyTarget, setVerifyTarget] = useState<AssignmentSummary | null>(null);
  const [transferTarget, setTransferTarget] = useState<AssignmentSummary | null>(null);

  const isAdult = useMemo(
    () => me?.members.some((m) => m.householdId === me.activeHouseholdId) ?? false,
    [me],
  );

  const assignments = useMemo(() => {
    if (!data) {
      return [];
    }
    if (activeFilter === "pending") {
      return data.pending;
    }
    if (activeFilter === "completed") {
      return data.completed;
    }
    return data.assignments;
  }, [data, activeFilter]);

  const pendingBuckets = useMemo(() => {
    const nowKey = dayKey(new Date());
    const source = assignments.filter((assignment) => !isCompletedStatus(assignment.status));

    const overdue = source.filter((assignment) => dayKey(assignment.dueDate) < nowKey);
    const today = source.filter((assignment) => dayKey(assignment.dueDate) === nowKey);
    const upcoming = source.filter((assignment) => dayKey(assignment.dueDate) > nowKey);

    return { overdue, today, upcoming };
  }, [assignments]);

  const handleVerifyConfirm = async (approved: boolean, feedback: string) => {
    if (!verifyTarget) return;
    try {
      await verifyMutation.mutateAsync({
        assignmentId: verifyTarget.id,
        approved,
        feedback: feedback.trim() || undefined,
      });
    } finally {
      setVerifyTarget(null);
    }
  };

  const renderCard = (assignment: AssignmentSummary) => {
    const isCompleting = completeMutation.isPending && completeMutation.variables === assignment.id;
    const isUncompleting =
      uncompleteMutation.isPending && uncompleteMutation.variables === assignment.id;
    const isVerifying =
      verifyMutation.isPending && verifyMutation.variables?.assignmentId === assignment.id;

    return (
      <AssignmentCard
        key={assignment.id}
        assignment={assignment}
        isMutating={isCompleting || isUncompleting || isVerifying}
        canVerify={isAdult}
        onComplete={() => completeMutation.mutate(assignment.id)}
        onUncomplete={() => uncompleteMutation.mutate(assignment.id)}
        onVerify={() => setVerifyTarget(assignment)}
        onTransfer={() => setTransferTarget(assignment)}
      />
    );
  };

  const isRefreshing = isLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", padding: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Mis tareas</Text>
          <Text style={{ marginTop: 4, color: "#6b7280" }}>
            {data
              ? `${data.stats.pendingCount} pendientes · ${data.stats.completedCount} completadas`
              : "Seguimiento diario del hogar"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => router.push("/(app)/task-catalog")}
            style={{
              borderWidth: 1,
              borderColor: semanticColors.primary,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: semanticColors.primary, fontWeight: "700" }}>Catálogo</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(app)/new-task")}
            style={{
              backgroundColor: semanticColors.primary,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Nueva</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {FILTERS.map((filter) => {
          const isActive = filter.id === activeFilter;
          return (
            <Pressable
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              style={{
                borderWidth: 1,
                borderColor: isActive ? semanticColors.primary : "#d1d5db",
                backgroundColor: isActive ? "#eff6ff" : "#ffffff",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 7,
              }}
            >
              <Text
                style={{ color: "#111111", fontWeight: isActive ? "700" : "500", fontSize: 12 }}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <Text style={{ marginTop: 24, color: "#666666" }}>Cargando tareas...</Text>
      ) : null}

      {isError ? (
        <View style={{ marginTop: 24, gap: 8 }}>
          <Text style={{ color: "#b91c1c" }}>{getMobileErrorMessage(error)}</Text>
          <Pressable onPress={() => void refetch()}>
            <Text style={{ color: semanticColors.primary, fontWeight: "600" }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !isError && assignments.length === 0 ? (
        <Text style={{ marginTop: 24, color: "#666666" }}>
          No tenés tareas asignadas por ahora.
        </Text>
      ) : null}

      <ScrollView
        style={{ marginTop: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refetch()} />
        }
      >
        {activeFilter === "pending" ? (
          <>
            {pendingBuckets.overdue.length > 0 ? (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: "#b91c1c", fontWeight: "700", marginBottom: 8 }}>
                  Atrasadas ({pendingBuckets.overdue.length})
                </Text>
                {pendingBuckets.overdue.map(renderCard)}
              </View>
            ) : null}

            {pendingBuckets.today.length > 0 ? (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: "#1f2937", fontWeight: "700", marginBottom: 8 }}>
                  Hoy ({pendingBuckets.today.length})
                </Text>
                {pendingBuckets.today.map(renderCard)}
              </View>
            ) : null}

            {pendingBuckets.upcoming.length > 0 ? (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: "#1f2937", fontWeight: "700", marginBottom: 8 }}>
                  Próximas ({pendingBuckets.upcoming.length})
                </Text>
                {pendingBuckets.upcoming.map(renderCard)}
              </View>
            ) : null}
          </>
        ) : (
          assignments.map(renderCard)
        )}
      </ScrollView>

      {verifyTarget ? (
        <VerifyModal
          assignment={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onConfirm={(approved, feedback) => void handleVerifyConfirm(approved, feedback)}
          isPending={verifyMutation.isPending}
        />
      ) : null}

      {transferTarget ? (
        <TransferModal
          assignment={transferTarget}
          onClose={() => setTransferTarget(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
