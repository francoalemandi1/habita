import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Chip, Sheet, TextField } from "@/components/ds";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import { FondoSetupAllocations } from "./fondo-setup-allocations";

import type { CreateFundPayload, ExpenseCategory } from "@habita/contracts";
import type { PlataMember } from "../plata-view-props";

interface FondoSetupSheetProps {
  visible: boolean;
  onClose: () => void;
  members: PlataMember[];
  onSetup: (payload: CreateFundPayload) => Promise<unknown>;
}

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "RENT", label: "Alquiler" },
  { value: "UTILITIES", label: "Servicios" },
  { value: "GROCERIES", label: "Supermercado" },
  { value: "HOME", label: "Hogar" },
  { value: "FOOD", label: "Comida" },
  { value: "HEALTH", label: "Salud" },
  { value: "ENTERTAINMENT", label: "Entretenimiento" },
  { value: "EDUCATION", label: "Educación" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "OTHER", label: "Otros" },
];

function parseAmount(value: string): number {
  return Number.parseFloat(value.replace(",", ".")) || 0;
}

/** ADULT-only "Armar el fondo" setup — name, monthly target, categories and per-member quotas. */
export function FondoSetupSheet({ visible, onClose, members, onSetup }: FondoSetupSheetProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState("Fondo Común");
  const [target, setTarget] = useState("");
  const [categories, setCategories] = useState<ExpenseCategory[]>(["RENT", "UTILITIES", "GROCERIES", "HOME"]);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTargetChange(value: string) {
    setTarget(value);
    const parsed = parseAmount(value);
    if (parsed > 0 && members.length > 0) {
      const share = String(Math.round(parsed / members.length));
      const next: Record<string, string> = {};
      for (const member of members) next[member.id] = share;
      setAllocations(next);
    }
  }

  function toggleCategory(value: ExpenseCategory) {
    setCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  const allocationTotal = members.reduce((sum, member) => sum + parseAmount(allocations[member.id] ?? "0"), 0);
  const targetAmount = parseAmount(target);

  async function handleSubmit() {
    if (targetAmount <= 0) {
      setError("Ingresá un objetivo mensual mayor a $0.");
      return;
    }
    if (categories.length === 0) {
      setError("Seleccioná al menos una categoría para el fondo.");
      return;
    }

    const memberAllocations = members
      .map((member) => ({ memberId: member.id, amount: parseAmount(allocations[member.id] ?? "0") }))
      .filter((allocation) => allocation.amount > 0);

    setIsSubmitting(true);
    setError(null);
    try {
      await onSetup({
        name: name || "Fondo Común",
        monthlyTarget: targetAmount,
        fundCategories: categories,
        allocations: memberAllocations.length > 0 ? memberAllocations : undefined,
      });
      onClose();
    } catch {
      setError("No se pudo armar el fondo. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Armar el fondo">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TextField label="Nombre del fondo" value={name} onChangeText={setName} placeholder="Fondo Común" />
          <TextField
            label="Objetivo mensual"
            keyboardType="numeric"
            value={target}
            onChangeText={handleTargetChange}
            placeholder="ej: 50000"
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Categorías del fondo</Text>
            <View style={styles.chipGrid}>
              {CATEGORY_OPTIONS.map((category) => (
                <Chip
                  key={category.value}
                  label={category.label}
                  tone={categories.includes(category.value) ? "filterOn" : "filterOff"}
                  onPress={() => toggleCategory(category.value)}
                />
              ))}
            </View>
          </View>

          <FondoSetupAllocations
            members={members}
            allocations={allocations}
            onChange={(memberId, value) => setAllocations((prev) => ({ ...prev, [memberId]: value }))}
            allocationTotal={allocationTotal}
            targetAmount={targetAmount}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button label="Armar el fondo" loadingLabel="Armando" loading={isSubmitting} onPress={handleSubmit} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: {
      gap: spacing.lg,
      paddingBottom: spacing.xl,
    },
    field: {
      gap: spacing.sm,
    },
    fieldLabel: {
      fontFamily: fontFamilyForWeight(600),
      fontSize: 13,
      color: c.ink,
    },
    chipGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    error: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 13,
      color: c.ladrilloText,
    },
  });
}
