import { useMemo, useState } from "react";
import { Redirect } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trash2, Pencil, ArrowRightLeft, Shuffle } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme";
import { fontFamilyForWeight, spacing } from "@/theme";
import type { ThemeColors } from "@/theme";
import {
  Avatar,
  AvatarGroup,
  Badge,
  Banner,
  Button,
  Checkbox,
  Chip,
  Coachmark,
  Composer,
  ContextMenu,
  Dialog,
  EmptyState,
  ListRow,
  ProgressBar,
  RadioGroup,
  ScreenHeader,
  SegmentedControl,
  Sheet,
  Skeleton,
  SplitBar,
  Stepper,
  StoreChip,
  SwipeRow,
  TextField,
  Toggle,
  useSnackbar,
} from "@/components/ds";
import type { CheckboxState } from "@/components/ds";

/** Reachable only by direct URL (`/dev-components`); no tab bar entry (§ Fase 2). */
export default function DevComponentsScreen(): React.JSX.Element | null {
  if (!__DEV__) return <Redirect href="/(app)/dashboard" />;
  return <DevComponentsGallery />;
}

function DevComponentsGallery(): React.JSX.Element {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const snackbar = useSnackbar();

  const [checkboxes, setCheckboxes] = useState<Record<string, CheckboxState>>({
    pending: "pending",
    done: "done",
  });
  const [toggleOn, setToggleOn] = useState(true);
  const [stepperValue, setStepperValue] = useState(2);
  const [radioValue, setRadioValue] = useState<"solo" | "pareja" | null>("pareja");
  const [segment, setSegment] = useState<"semana" | "lista" | "reparto">("semana");
  const [textValue, setTextValue] = useState("");
  const [composerValue, setComposerValue] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [coachmarkVisible, setCoachmarkVisible] = useState(true);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Button</Text>
        <View style={styles.row}>
          <Button label="Guardar gasto" onPress={() => {}} />
          <Button label="Liquidar" variant="ink" onPress={() => {}} />
        </View>
        <View style={styles.row}>
          <Button label="Cancelar" variant="secondary" onPress={() => {}} />
          <Button label="Ver más" variant="link" onPress={() => {}} />
          <Button label="Eliminar" variant="destructive" onPress={() => {}} />
        </View>
        <View style={styles.row}>
          <Button label="Guardar" disabled onPress={() => {}} />
          <Button label="Guardar" loading loadingLabel="Guardando" onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>TextField</Text>
        <TextField label="Nombre de la casa" value={textValue} onChangeText={setTextValue} />
        <TextField label="Con error" value="" error="Elegí un nombre para seguir" onChangeText={() => {}} />

        <Text style={styles.sectionTitle}>Checkbox (5 estados)</Text>
        <View style={styles.row}>
          <Checkbox state="pending" accessibilityLabel="Pendiente" onToggle={(next) => setCheckboxes((c) => ({ ...c, a: next }))} />
          <Checkbox
            state={checkboxes.done ?? "done"}
            accessibilityLabel="Hecha"
            onToggle={(next) => setCheckboxes((c) => ({ ...c, done: next }))}
          />
          <Checkbox state="toVerify" accessibilityLabel="A verificar" onToggle={() => {}} requiresVerification />
          <Checkbox state="transferred" accessibilityLabel="Pasada" onToggle={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>Toggle / Stepper / Radio</Text>
        <View style={styles.row}>
          <Toggle value={toggleOn} onValueChange={setToggleOn} accessibilityLabel="Avisos" />
          <Stepper value={stepperValue} onValueChange={setStepperValue} min={0} max={10} accessibilityLabel="Cantidad" />
        </View>
        <RadioGroup
          accessibilityLabel="¿Con quién vivís?"
          value={radioValue}
          onValueChange={setRadioValue}
          options={[
            { value: "solo", label: "Solo/a" },
            { value: "pareja", label: "En pareja" },
          ]}
        />

        <Text style={styles.sectionTitle}>SegmentedControl / Chip / StoreChip</Text>
        <SegmentedControl
          accessibilityLabel="Vista de tareas"
          value={segment}
          onValueChange={setSegment}
          options={[
            { value: "semana", label: "Semana" },
            { value: "lista", label: "Lista" },
            { value: "reparto", label: "Reparto" },
          ]}
        />
        <View style={styles.row}>
          <Chip label="Al día" tone="onDay" />
          <Chip label="Vence hoy" tone="dueToday" />
          <Chip label="−35%" tone="discount" />
          <Chip label="Esperando" tone="waiting" />
          <StoreChip storeName="Coto" />
        </View>

        <Text style={styles.sectionTitle}>Avatar / AvatarGroup / Badge</Text>
        <View style={styles.row}>
          <Avatar name="Sofi" />
          <Avatar name="Vos" isCurrentUser />
          <AvatarGroup
            members={[
              { id: "1", name: "Vos", isCurrentUser: true },
              { id: "2", name: "Sofi" },
              { id: "3", name: "Tomi" },
            ]}
          />
          <Badge label="Nuevo" tone="manteca" />
        </View>

        <Text style={styles.sectionTitle}>Banner</Text>
        <Banner tone="info" text="Revisá tus próximos pagos." />
        <Banner tone="offer" text="Ahorrás $6.210 este mes." />
        <Banner tone="attention" text="Le debés $16.107 a Sofi." />
        <Banner tone="offline" text="Necesitás conexión." />

        <Text style={styles.sectionTitle}>ProgressBar / SplitBar</Text>
        <ProgressBar progress={0.65} accessibilityLabel="Progreso del fondo" />
        <SplitBar values={[4, 4, 3]} total={18} accessibilityLabel="Reparto de tareas" />

        <Text style={styles.sectionTitle}>ListRow / SwipeRow</Text>
        <SwipeRow
          onDone={() => snackbar.show({ text: "«Lavar platos» · hecha", tone: "default", actionLabel: "Deshacer" })}
          onPass={() => snackbar.show({ text: "Se le avisa a Sofi", tone: "navigation" })}
          onDelete={() => snackbar.show({ text: "Tarea borrada", tone: "default", actionLabel: "Deshacer" })}
        >
          <ListRow title="Lavar los platos" meta="Hoy · martes 3" trailingAmount="" />
        </SwipeRow>
        <ContextMenu
          items={[
            { key: "edit", label: "Editar", icon: Pencil, onPress: () => {} },
            { key: "transfer", label: "Pasar a alguien", icon: ArrowRightLeft, onPress: () => {} },
            { key: "shuffle", label: "Hacer rotación", icon: Shuffle, onPress: () => {} },
            { key: "delete", label: "Eliminar", icon: Trash2, onPress: () => {}, destructive: true },
          ]}
        >
          <ListRow title="Mantener presionado para el menú" meta="Long-press" trailingAmount="" />
        </ContextMenu>

        <Text style={styles.sectionTitle}>Skeleton</Text>
        <View style={styles.row}>
          <Skeleton width={120} height={16} />
          <Skeleton width={60} height={16} />
        </View>

        <Text style={styles.sectionTitle}>EmptyState</Text>
        <EmptyState title="Sin gastos todavía" description="Anotá el primero para arrancar." actionLabel="Anotar gasto" onAction={() => {}} />

        <Text style={styles.sectionTitle}>Composer</Text>
        <Composer value={composerValue} onChangeText={setComposerValue} onSubmit={() => setComposerValue("")} />

        <Text style={styles.sectionTitle}>Sheet / Dialog</Text>
        <View style={styles.row}>
          <Button label="Abrir sheet" variant="secondary" onPress={() => setSheetOpen(true)} />
          <Button label="Abrir dialog" variant="secondary" onPress={() => setDialogOpen(true)} />
        </View>

        {coachmarkVisible ? (
          <>
            <Text style={styles.sectionTitle}>Coachmark</Text>
            <Coachmark text="Tocá + para anotar un gasto, tarea o ítem." onDismiss={() => setCoachmarkVisible(false)} />
          </>
        ) : null}

        <Text style={styles.sectionTitle}>ScreenHeader (detail variant)</Text>
        <ScreenHeader variant="detail" title="Detalle de gasto" backLabel="Plata" onBack={() => {}} />
        <ScreenHeader variant="sheetHeader" title="Anotar" cancelLabel="Cancelar" onCancel={() => {}} actionLabel="Guardar" onAction={() => {}} />
      </ScrollView>

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Pasar tarea" cancelLabel="Cancelar" actionLabel="Pedirle a Tomi" onAction={() => setSheetOpen(false)}>
        <Text style={styles.body}>Tomi tiene que aceptar. Hasta entonces sigue siendo tuya.</Text>
      </Sheet>

      <Dialog
        visible={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Eliminar gasto"
        body="Esto reabre los saldos entre vos y Sofi."
        actionLabel="Eliminar"
        onConfirm={() => setDialogOpen(false)}
      />
    </SafeAreaView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.paper,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      flexWrap: "wrap",
    },
    sectionTitle: {
      fontFamily: fontFamilyForWeight(700),
      fontSize: 17,
      color: c.ink,
      marginTop: spacing.lg,
    },
    body: {
      fontFamily: fontFamilyForWeight(400),
      fontSize: 15,
      color: c.ink2,
    },
  });
}
