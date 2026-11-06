import { useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@habita/contracts";
import { Sheet, useSnackbar } from "@/components/ds";
import { useMembers } from "@/hooks/use-members";
import { useAnotarSave } from "@/hooks/use-anotar-save";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { AnotarAutoFlow } from "./anotar-auto-flow";
import { AnotarClassicForm } from "./anotar-classic-form";
import type { AnotarClassicReason } from "./anotar-classic-form";
import type { AnotarKind } from "./anotar-unknown";
import type { AnotarPrefill } from "@/lib/anotar-store";

interface AnotarSheetContentProps {
  visible: boolean;
  prefill: AnotarPrefill | null;
  onClose: () => void;
}

const SNACKBAR_BY_KIND: Record<AnotarKind, { text: string; href: "/(app)/plata" | "/(app)/tareas" | "/(app)/super" }> = {
  expense: { text: "Gasto anotado · Ver", href: "/(app)/plata" },
  task: { text: "Tarea anotada · Ver", href: "/(app)/tareas" },
  item: { text: "Sumado a la lista · Ver", href: "/(app)/super" },
};

/** §5.3 Global "Anotar" / §6.22 Composer / §7 pattern B — the real Anotar sheet. */
export function AnotarSheetContent({ visible, prefill, onClose }: AnotarSheetContentProps): React.JSX.Element {
  const { me, activeHouseholdId } = useMobileAuth();
  const { data: membersData } = useMembers();
  const members = membersData?.members ?? [];
  const currentMemberId = me?.members.find((m) => m.householdId === activeHouseholdId)?.id ?? me?.members[0]?.id ?? null;

  const { save, isSaving } = useAnotarSave();
  const { show } = useSnackbar();
  const queryClient = useQueryClient();

  const [text, setText] = useState(prefill?.text ?? "");
  const [classic, setClassic] = useState<{ kind: AnotarKind; reason: AnotarClassicReason } | null>(
    prefill?.kind ? { kind: prefill.kind, reason: "manual" } : null,
  );

  const handleSaved = (kind: AnotarKind) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.balances() });
    onClose();
    const { text: snackbarText, href } = SNACKBAR_BY_KIND[kind];
    show({ text: snackbarText, actionLabel: "Ver", onAction: () => router.push(href) });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Anotar">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {classic ? (
          <AnotarClassicForm
            initialKind={classic.kind}
            initialText={text}
            initialAmount={prefill?.expense?.amount?.toString()}
            initialCategory={prefill?.expense?.category}
            reason={classic.reason}
            members={members}
            currentMemberId={currentMemberId}
            isSaving={isSaving}
            onSave={save}
            onSaved={() => handleSaved(classic.kind)}
          />
        ) : (
          <AnotarAutoFlow
            text={text}
            onChangeText={setText}
            members={members}
            currentMemberId={currentMemberId}
            isSaving={isSaving}
            onSave={save}
            onSaved={handleSaved}
            onSwitchToClassic={(kind, reason) => setClassic({ kind, reason })}
          />
        )}
      </KeyboardAvoidingView>
    </Sheet>
  );
}
