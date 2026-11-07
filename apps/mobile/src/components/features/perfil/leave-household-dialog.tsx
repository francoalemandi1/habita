import { Alert } from "react-native";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { Dialog } from "@/components/ds";
import { useLeaveHousehold } from "@/hooks/use-leave-household";
import { getLeaveHouseholdErrorMessage } from "@/lib/perfil-leave-error";
import { useMobileAuth } from "@/providers/mobile-auth-provider";

export interface LeaveHouseholdDialogProps {
  visible: boolean;
  onClose: () => void;
  householdName: string;
}

/** §5.3 Perfil / §7 pattern D — "Salir de la casa" requires typing the household name. */
export function LeaveHouseholdDialog({ visible, onClose, householdName }: LeaveHouseholdDialogProps): React.JSX.Element {
  const { setHouseholdId, hydrate } = useMobileAuth();
  const leaveHousehold = useLeaveHousehold();

  // The leave already succeeded here: a failed refresh must not strand the user on a household they left.
  const goToNextPlace = async (nextHouseholdId: string | null) => {
    try {
      if (nextHouseholdId) await setHouseholdId(nextHouseholdId);
      await hydrate();
    } catch (error) {
      console.warn("[perfil] Left the household but could not refresh the session", error);
    }
    router.replace(nextHouseholdId ? "/(app)/casa" : "/(auth)/onboarding");
  };

  const handleConfirm = () => {
    if (leaveHousehold.isPending) return;
    leaveHousehold.mutate(undefined, {
      onSuccess: (data) => {
        onClose();
        void goToNextPlace(data.nextHouseholdId);
      },
      onError: (error) => {
        Alert.alert("No se pudo salir", getLeaveHouseholdErrorMessage(error));
      },
    });
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      icon={LogOut}
      title={`Salir de ${householdName}`}
      body="Vas a dejar de ver las tareas, los gastos y las compras de esta casa. Tus tareas pendientes se reasignan a otro miembro."
      actionLabel={leaveHousehold.isPending ? "Saliendo" : "Salir de la casa"}
      onConfirm={handleConfirm}
      confirmName={householdName}
    />
  );
}
