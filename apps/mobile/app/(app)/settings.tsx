import { useState } from "react";
import { router } from "expo-router";
import type { RelativePathString } from "expo-router";
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { useMobileAuth } from "@/providers/mobile-auth-provider";
import { useUpdateMember } from "@/hooks/use-member-profile";
import { getMobileErrorMessage } from "@/lib/mobile-error";
import { semanticColors } from "@habita/design-tokens";

// ── Edit profile modal ──────────────────────────────────────────────────────

interface EditProfileModalProps {
  visible: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (name: string) => void;
  isLoading: boolean;
}

function EditProfileModal({ visible, currentName, onClose, onSave, isLoading }: EditProfileModalProps) {
  const [name, setName] = useState(currentName);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 16 }}>
            Editar perfil
          </Text>

          <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 10,
              padding: 12,
              fontSize: 16,
              marginBottom: 20,
            }}
          />

          <Pressable
            onPress={() => {
              if (name.trim()) onSave(name.trim());
            }}
            disabled={isLoading || !name.trim()}
            style={{
              backgroundColor: semanticColors.primary,
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
              marginBottom: 10,
              opacity: isLoading || !name.trim() ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ alignItems: "center", padding: 10 }}>
            <Text style={{ color: "#6b7280" }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Settings row ────────────────────────────────────────────────────────────

interface SettingsRowProps {
  label: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  rightLabel?: string;
}

function SettingsRow({ label, subtitle, onPress, color, rightLabel }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}
    >
      <View>
        <Text style={{ fontSize: 15, color: color ?? "#111", fontWeight: "500" }}>{label}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{subtitle}</Text>}
      </View>
      <Text style={{ color: "#9ca3af", fontSize: 16 }}>{rightLabel ?? "›"}</Text>
    </Pressable>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { me, activeHouseholdId, setHouseholdId, hydrate, logout } = useMobileAuth();
  const updateMember = useUpdateMember();

  const [showEditProfile, setShowEditProfile] = useState(false);

  const myMember = me?.members.find((m) => m.householdId === activeHouseholdId) ?? me?.members[0];

  const handleSaveProfile = (name: string) => {
    if (!myMember) return;
    updateMember.mutate(
      { memberId: myMember.id, payload: { name } },
      {
        onSuccess: async () => {
          setShowEditProfile(false);
          await hydrate();
        },
        onError: (err) => {
          Alert.alert("Error", getMobileErrorMessage(err));
        },
      },
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#111" }}>Ajustes</Text>

        {/* Profile section */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9ca3af", marginBottom: 4, letterSpacing: 0.5 }}>
            PERFIL
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 14,
              paddingHorizontal: 16,
              backgroundColor: "#fff",
            }}
          >
            <View style={{ paddingVertical: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111" }}>
                {myMember?.name ?? me?.name ?? "—"}
              </Text>
              <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                {me?.email ?? ""}
              </Text>
            </View>
            <SettingsRow
              label="Editar nombre"
              subtitle="Cambiá cómo aparecés en el hogar"
              onPress={() => setShowEditProfile(true)}
            />
            <SettingsRow
              label="Mis preferencias de tareas"
              subtitle="Indicá qué tareas te gustan o evitás"
              onPress={() => router.push("/(app)/preferences" as RelativePathString)}
            />
          </View>
        </View>

        {/* Household section */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9ca3af", marginBottom: 4, letterSpacing: 0.5 }}>
            HOGAR ACTIVO
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 14,
              paddingHorizontal: 16,
              backgroundColor: "#fff",
            }}
          >
            {me?.households.length ? (
              me.households.map((household) => {
                const isActive = household.id === activeHouseholdId;
                return (
                  <Pressable
                    key={household.id}
                    onPress={async () => {
                      await setHouseholdId(household.id);
                      await hydrate();
                    }}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 13,
                      borderBottomWidth: 1,
                      borderBottomColor: "#f3f4f6",
                    }}
                  >
                    <View>
                      <Text style={{ fontWeight: isActive ? "700" : "500", color: isActive ? semanticColors.primary : "#111" }}>
                        {household.name}
                      </Text>
                    </View>
                    {isActive && (
                      <View style={{ backgroundColor: "#dcfce7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "700" }}>Activo</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <Text style={{ color: "#6b7280", paddingVertical: 14 }}>Sin hogares activos.</Text>
            )}
            <SettingsRow
              label="Unirme a otro hogar"
              onPress={() => router.push("/(auth)/join")}
              color="#16a34a"
            />
          </View>
        </View>

        {/* Tools section */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9ca3af", marginBottom: 4, letterSpacing: 0.5 }}>
            HERRAMIENTAS
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 14,
              paddingHorizontal: 16,
              backgroundColor: "#fff",
            }}
          >
            <SettingsRow
              label="🎰 Ruleta de tareas"
              subtitle="Asigná una tarea al azar"
              onPress={() => router.push("/(app)/roulette" as RelativePathString)}
            />
            <SettingsRow
              label="✨ Sugerir tareas AI"
              subtitle="Generá un catálogo personalizado"
              onPress={() => router.push("/(app)/suggest-tasks" as RelativePathString)}
            />
            <SettingsRow
              label="🏷 Ofertas del super"
              subtitle="Mejores precios por categoría"
              onPress={() => router.push("/(app)/grocery-deals" as RelativePathString)}
            />
          </View>
        </View>

        {/* Account section */}
        <View style={{ marginTop: 24, marginBottom: 40 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#9ca3af", marginBottom: 4, letterSpacing: 0.5 }}>
            CUENTA
          </Text>
          <Pressable
            onPress={async () => {
              await logout();
              router.replace("/(auth)/login");
            }}
            style={{
              borderWidth: 1,
              borderColor: "#fecaca",
              borderRadius: 14,
              padding: 14,
              backgroundColor: "#fff1f2",
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "700", color: "#b91c1c", fontSize: 15 }}>
              Cerrar sesión
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={showEditProfile}
        currentName={myMember?.name ?? me?.name ?? ""}
        onClose={() => setShowEditProfile(false)}
        onSave={handleSaveProfile}
        isLoading={updateMember.isPending}
      />
    </SafeAreaView>
  );
}
