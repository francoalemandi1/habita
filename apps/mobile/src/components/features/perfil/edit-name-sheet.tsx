import { useState } from "react";
import { Alert } from "react-native";
import { Button, Sheet, TextField } from "@/components/ds";
import { useUpdateMember } from "@/hooks/use-member-profile";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { spacing } from "@/theme";

export interface EditNameSheetProps {
  visible: boolean;
  onClose: () => void;
  memberId: string;
  initialName: string;
}

export function EditNameSheet({ visible, onClose, memberId, initialName }: EditNameSheetProps): React.JSX.Element {
  const [name, setName] = useState(initialName);
  const [wasVisible, setWasVisible] = useState(visible);
  const updateMember = useUpdateMember();
  const { hydrate } = useMobileAuth();

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setName(initialName);
  }

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateMember.mutate(
      { memberId, payload: { name: trimmed } },
      {
        onSuccess: async () => {
          onClose();
          await hydrate();
        },
        onError: (error) => {
          Alert.alert("No se pudo guardar", getMobileErrorMessage(error));
        },
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Editar nombre">
      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
      <Button
        label="Guardar"
        loading={updateMember.isPending}
        disabled={!name.trim() || updateMember.isPending}
        onPress={handleSave}
        style={{ marginTop: spacing.lg }}
      />
    </Sheet>
  );
}
