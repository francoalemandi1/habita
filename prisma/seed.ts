import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// CATALOG DATA (Static)
// ============================================

const taskCatalog = [
  // Cocina
  { name: "Lavar platos", category: "Cocina", defaultWeight: 2, estimatedMinutes: 15 },
  { name: "Preparar desayuno", category: "Cocina", defaultWeight: 2, estimatedMinutes: 20 },
  { name: "Preparar almuerzo", category: "Cocina", defaultWeight: 3, estimatedMinutes: 45 },
  { name: "Preparar cena", category: "Cocina", defaultWeight: 3, estimatedMinutes: 45 },
  { name: "Limpiar cocina", category: "Cocina", defaultWeight: 3, estimatedMinutes: 30 },
  { name: "Organizar despensa", category: "Cocina", defaultWeight: 2, estimatedMinutes: 20 },

  // Limpieza
  { name: "Barrer", category: "Limpieza", defaultWeight: 2, estimatedMinutes: 15, suggestedMinAge: 8 },
  { name: "Trapear", category: "Limpieza", defaultWeight: 3, estimatedMinutes: 25 },
  { name: "Aspirar", category: "Limpieza", defaultWeight: 2, estimatedMinutes: 20 },
  { name: "Limpiar baños", category: "Limpieza", defaultWeight: 4, estimatedMinutes: 30 },
  { name: "Limpiar espejos", category: "Limpieza", defaultWeight: 1, estimatedMinutes: 10, suggestedMinAge: 10 },
  { name: "Sacudir muebles", category: "Limpieza", defaultWeight: 1, estimatedMinutes: 15, suggestedMinAge: 8 },

  // Lavandería
  { name: "Poner lavadora", category: "Lavandería", defaultWeight: 2, estimatedMinutes: 10 },
  { name: "Tender ropa", category: "Lavandería", defaultWeight: 2, estimatedMinutes: 15, suggestedMinAge: 10 },
  { name: "Doblar ropa", category: "Lavandería", defaultWeight: 2, estimatedMinutes: 20, suggestedMinAge: 8 },
  { name: "Planchar", category: "Lavandería", defaultWeight: 3, estimatedMinutes: 30 },
  { name: "Guardar ropa", category: "Lavandería", defaultWeight: 1, estimatedMinutes: 10, suggestedMinAge: 6 },

  // Exterior
  { name: "Sacar basura", category: "Exterior", defaultWeight: 1, estimatedMinutes: 5, suggestedMinAge: 10 },
  { name: "Regar plantas", category: "Exterior", defaultWeight: 1, estimatedMinutes: 10, suggestedMinAge: 6 },
  { name: "Cortar pasto", category: "Exterior", defaultWeight: 4, estimatedMinutes: 45 },
  { name: "Limpiar patio", category: "Exterior", defaultWeight: 3, estimatedMinutes: 30 },

  // Mascotas
  { name: "Alimentar mascotas", category: "Mascotas", defaultWeight: 1, estimatedMinutes: 5, suggestedMinAge: 6 },
  { name: "Pasear perro", category: "Mascotas", defaultWeight: 2, estimatedMinutes: 30, suggestedMinAge: 12 },
  { name: "Limpiar arenero", category: "Mascotas", defaultWeight: 2, estimatedMinutes: 10 },

  // Habitaciones
  { name: "Hacer cama", category: "Habitación", defaultWeight: 1, estimatedMinutes: 5, suggestedMinAge: 6 },
  { name: "Ordenar habitación", category: "Habitación", defaultWeight: 2, estimatedMinutes: 15, suggestedMinAge: 6 },
  { name: "Cambiar sábanas", category: "Habitación", defaultWeight: 2, estimatedMinutes: 15 },

  // Compras
  { name: "Hacer lista de compras", category: "Compras", defaultWeight: 1, estimatedMinutes: 10 },
  { name: "Ir al supermercado", category: "Compras", defaultWeight: 3, estimatedMinutes: 60 },
  { name: "Guardar compras", category: "Compras", defaultWeight: 2, estimatedMinutes: 15, suggestedMinAge: 8 },
];

const achievements = [
  { code: "FIRST_TASK", name: "Primera tarea", description: "Completaste tu primera tarea", xpReward: 10 },
  { code: "TASKS_10", name: "Ayudante", description: "Completaste 10 tareas", xpReward: 20 },
  { code: "TASKS_50", name: "Colaborador", description: "Completaste 50 tareas", xpReward: 75 },
  { code: "TASKS_100", name: "Experto doméstico", description: "Completaste 100 tareas", xpReward: 150 },
  { code: "EARLY_BIRD", name: "Madrugador", description: "Completaste una tarea antes de las 8am", xpReward: 15 },
  { code: "TEAM_PLAYER", name: "Jugador de equipo", description: "Ayudaste a otro miembro", xpReward: 30 },
  { code: "LEVEL_5", name: "Nivel 5", description: "Alcanzaste el nivel 5", xpReward: 50 },
  { code: "LEVEL_10", name: "Nivel 10", description: "Alcanzaste el nivel 10", xpReward: 100 },
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedCatalog() {
  console.log("Seeding task catalog...");
  for (const task of taskCatalog) {
    await prisma.taskCatalog.upsert({
      where: { id: task.name.toLowerCase().replace(/\s+/g, "-") },
      update: task,
      create: {
        id: task.name.toLowerCase().replace(/\s+/g, "-"),
        ...task,
        defaultFrequency: "WEEKLY",
      },
    });
  }
  console.log(`  ✓ Seeded ${taskCatalog.length} task catalog entries`);
}

async function seedAchievements() {
  console.log("Seeding achievements...");
  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: achievement,
      create: achievement,
    });
  }
  console.log(`  ✓ Seeded ${achievements.length} achievements`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("🌱 Starting database seed...\n");

  await seedCatalog();
  await seedAchievements();

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
