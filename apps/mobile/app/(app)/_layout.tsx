import { Redirect, Tabs } from "expo-router";
import { useMobileAuth } from "@/providers/mobile-auth-provider";

export default function AppLayout() {
  const { isAuthenticated, isBootstrapping, me } = useMobileAuth();

  if (!isBootstrapping && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!isBootstrapping && isAuthenticated && me && !me.hasMembership) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#111111",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Inicio",
          tabBarLabel: "Inicio",
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: "Mis tareas", tabBarLabel: "Tareas" }}
      />
      <Tabs.Screen
        name="expenses"
        options={{ title: "Registrá", tabBarLabel: "Gastos" }}
      />
      <Tabs.Screen
        name="shopping-plan"
        options={{ title: "Ahorra", tabBarLabel: "Ahorra" }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarLabel: "Ajustes",
        }}
      />
      <Tabs.Screen
        name="new-task"
        options={{
          href: null,
          title: "Nueva tarea",
        }}
      />
      <Tabs.Screen
        name="new-expense"
        options={{
          href: null,
          title: "Nuevo gasto",
        }}
      />
      <Tabs.Screen
        name="expense-insights"
        options={{
          href: null,
          title: "Insights financieros",
        }}
      />
      <Tabs.Screen
        name="weekly-plan"
        options={{
          href: null,
          title: "Plan semanal AI",
        }}
      />
      <Tabs.Screen
        name="transfers"
        options={{
          href: null,
          title: "Transferencias",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: "Notificaciones",
        }}
      />
      <Tabs.Screen
        name="task-catalog"
        options={{
          href: null,
          title: "Catálogo de tareas",
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          href: null,
          title: "Progreso familiar",
        }}
      />
      <Tabs.Screen
        name="fund"
        options={{
          href: null,
          title: "Fondo Común",
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          href: null,
          title: "Servicios",
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          href: null,
          title: "Descubrí",
        }}
      />
      <Tabs.Screen
        name="cocina"
        options={{
          href: null,
          title: "Cociná",
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          href: null,
          title: "Mis preferencias",
        }}
      />
      <Tabs.Screen
        name="roulette"
        options={{
          href: null,
          title: "Ruleta de tareas",
        }}
      />
      <Tabs.Screen
        name="suggest-tasks"
        options={{
          href: null,
          title: "Sugerencias AI",
        }}
      />
      <Tabs.Screen
        name="grocery-deals"
        options={{
          href: null,
          title: "Ofertas del super",
        }}
      />
    </Tabs>
  );
}
