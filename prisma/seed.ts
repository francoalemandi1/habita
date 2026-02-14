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

// ============================================
// PRODUCT CATALOG DATA (Grocery Advisor)
// ============================================

const productCatalog: Array<{
  name: string;
  searchTerms: string;
  category: "ALMACEN" | "PANADERIA_DULCES" | "LACTEOS" | "CARNES" | "FRUTAS_VERDURAS" | "BEBIDAS" | "LIMPIEZA" | "PERFUMERIA";
  isEssential?: boolean;
  isActive?: boolean;
}> = [
  // ── ALMACEN ──
  { name: "Aceite girasol", searchTerms: "aceite girasol 1.5 litros", category: "ALMACEN", isEssential: true },
  { name: "Aceite de oliva", searchTerms: "aceite oliva 500ml", category: "ALMACEN" },
  { name: "Fideos secos", searchTerms: "fideos secos 500g spaghetti", category: "ALMACEN", isEssential: true },
  { name: "Puré de tomate", searchTerms: "pure de tomate 520g", category: "ALMACEN", isEssential: true },
  { name: "Atún en lata", searchTerms: "atun lata 170g", category: "ALMACEN" },
  { name: "Arvejas en lata", searchTerms: "arvejas lata 350g", category: "ALMACEN" },
  { name: "Sal fina", searchTerms: "sal fina 500g", category: "ALMACEN" },
  { name: "Mayonesa", searchTerms: "mayonesa 500g", category: "ALMACEN" },
  { name: "Harina 000", searchTerms: "harina 000 1 kilo", category: "ALMACEN", isEssential: true },
  { name: "Polenta", searchTerms: "polenta instantanea 500g", category: "ALMACEN" },
  { name: "Pan rallado", searchTerms: "pan rallado 500g", category: "ALMACEN" },
  { name: "Arroz largo fino", searchTerms: "arroz largo fino 1 kilo", category: "ALMACEN", isEssential: true },
  { name: "Papas fritas", searchTerms: "papas fritas snack 150g", category: "ALMACEN" },

  // ── PANADERIA_DULCES ──
  { name: "Galletitas dulces", searchTerms: "galletitas dulces 300g", category: "PANADERIA_DULCES" },
  { name: "Galletitas de agua", searchTerms: "galletitas de agua crackers 300g", category: "PANADERIA_DULCES" },
  { name: "Dulce de leche", searchTerms: "dulce de leche 400g", category: "PANADERIA_DULCES", isEssential: true },
  { name: "Mermelada", searchTerms: "mermelada durazno frutilla 454g", category: "PANADERIA_DULCES" },
  { name: "Yerba mate", searchTerms: "yerba mate 1 kilo", category: "PANADERIA_DULCES", isEssential: true },
  { name: "Café molido", searchTerms: "cafe molido 250g", category: "PANADERIA_DULCES", isEssential: true },
  { name: "Té en saquitos", searchTerms: "te en saquitos x25", category: "PANADERIA_DULCES" },
  { name: "Azúcar", searchTerms: "azucar 1 kilo", category: "PANADERIA_DULCES", isEssential: true },
  { name: "Chocolate tableta", searchTerms: "chocolate tableta 100g", category: "PANADERIA_DULCES" },
  { name: "Alfajor triple", searchTerms: "alfajor triple chocolate", category: "PANADERIA_DULCES" },
  { name: "Avena", searchTerms: "avena arrollada 400g", category: "PANADERIA_DULCES" },
  { name: "Cereales integrales", searchTerms: "cereales integrales 300g", category: "PANADERIA_DULCES" },
  { name: "Pan lactal", searchTerms: "pan lactal 400g", category: "PANADERIA_DULCES", isEssential: true },
  { name: "Cacao en polvo", searchTerms: "cacao en polvo 360g chocolatada", category: "PANADERIA_DULCES" },

  // ── LACTEOS ──
  { name: "Leche entera", searchTerms: "leche entera sachet 1 litro", category: "LACTEOS", isEssential: true },
  { name: "Leche descremada", searchTerms: "leche descremada 1 litro", category: "LACTEOS" },
  { name: "Yogur entero", searchTerms: "yogur entero 190g", category: "LACTEOS" },
  { name: "Manteca", searchTerms: "manteca 200g", category: "LACTEOS", isEssential: true, isActive: false },
  // (Dulce de leche ya está en PANADERIA_DULCES)
  { name: "Crema de leche", searchTerms: "crema de leche 200ml", category: "LACTEOS" },
  { name: "Huevos", searchTerms: "maple huevos docena x12", category: "LACTEOS", isEssential: true, isActive: false },
  { name: "Queso cremoso", searchTerms: "queso cremoso por kilo", category: "LACTEOS", isEssential: true, isActive: false },
  { name: "Queso rallado", searchTerms: "queso rallado 150g", category: "LACTEOS" },
  { name: "Queso crema", searchTerms: "queso crema untable 300g", category: "LACTEOS" },
  { name: "Jamón cocido", searchTerms: "jamon cocido feteado 150g", category: "LACTEOS" },
  { name: "Tapas de empanadas", searchTerms: "tapas empanadas x12", category: "LACTEOS" },
  { name: "Salchichas", searchTerms: "salchichas 6 unidades", category: "LACTEOS" },

  // ── CARNES (desactivados — Precios Claros no indexa carne fresca) ──
  { name: "Carne picada", searchTerms: "carne picada especial por kilo", category: "CARNES", isEssential: true, isActive: false },
  { name: "Milanesa de nalga", searchTerms: "milanesa nalga por kilo", category: "CARNES", isEssential: true, isActive: false },
  { name: "Asado de tira", searchTerms: "asado tira por kilo", category: "CARNES", isActive: false },
  { name: "Vacío", searchTerms: "vacio carne por kilo", category: "CARNES", isActive: false },
  { name: "Paleta", searchTerms: "paleta carne por kilo", category: "CARNES", isActive: false },
  { name: "Pechuga de pollo", searchTerms: "pechuga pollo por kilo", category: "CARNES", isEssential: true, isActive: false },
  { name: "Pollo entero", searchTerms: "pollo entero por kilo", category: "CARNES", isActive: false },
  { name: "Hamburguesas", searchTerms: "hamburguesas congeladas x4", category: "CARNES", isActive: false },
  { name: "Nuggets de pollo", searchTerms: "nuggets pollo 300g", category: "CARNES", isActive: false },
  { name: "Bondiola de cerdo", searchTerms: "bondiola cerdo por kilo", category: "CARNES", isActive: false },

  // ── FRUTAS_VERDURAS (desactivados — Precios Claros no indexa productos a granel) ──
  { name: "Banana", searchTerms: "banana por kilo", category: "FRUTAS_VERDURAS", isEssential: true, isActive: false },
  { name: "Manzana roja", searchTerms: "manzana roja por kilo", category: "FRUTAS_VERDURAS", isEssential: true, isActive: false },
  { name: "Naranja", searchTerms: "naranja por kilo", category: "FRUTAS_VERDURAS", isActive: false },
  { name: "Mandarina", searchTerms: "mandarina por kilo", category: "FRUTAS_VERDURAS", isActive: false },
  { name: "Tomate redondo", searchTerms: "tomate redondo por kilo", category: "FRUTAS_VERDURAS", isEssential: true, isActive: false },
  { name: "Papa", searchTerms: "papa por kilo", category: "FRUTAS_VERDURAS", isEssential: true, isActive: false },
  { name: "Cebolla", searchTerms: "cebolla por kilo", category: "FRUTAS_VERDURAS", isEssential: true, isActive: false },
  { name: "Zanahoria", searchTerms: "zanahoria por kilo", category: "FRUTAS_VERDURAS", isActive: false },
  { name: "Lechuga", searchTerms: "lechuga por unidad", category: "FRUTAS_VERDURAS", isActive: false },
  { name: "Pimiento", searchTerms: "pimiento morron por kilo", category: "FRUTAS_VERDURAS", isActive: false },
  { name: "Zapallo", searchTerms: "zapallo anco por kilo", category: "FRUTAS_VERDURAS", isActive: false },
  { name: "Limón", searchTerms: "limon por kilo", category: "FRUTAS_VERDURAS", isActive: false },

  // ── BEBIDAS ──
  { name: "Gaseosa cola", searchTerms: "gaseosa cola 2.25 litros", category: "BEBIDAS" },
  { name: "Gaseosa lima limón", searchTerms: "gaseosa lima limon 2.25 litros", category: "BEBIDAS" },
  { name: "Agua mineral", searchTerms: "agua mineral sin gas 1.5 litros", category: "BEBIDAS", isEssential: true },
  { name: "Agua bidón", searchTerms: "agua bidon 6 litros", category: "BEBIDAS" },
  { name: "Cerveza rubia", searchTerms: "cerveza rubia 1 litro", category: "BEBIDAS" },
  { name: "Vino tinto malbec", searchTerms: "vino tinto malbec 750ml", category: "BEBIDAS" },
  { name: "Fernet", searchTerms: "fernet 750ml", category: "BEBIDAS" },
  { name: "Jugo de naranja", searchTerms: "jugo naranja 1 litro", category: "BEBIDAS" },
  { name: "Jugo en polvo", searchTerms: "jugo en polvo sobre", category: "BEBIDAS" },
  { name: "Soda", searchTerms: "soda sifon 2 litros", category: "BEBIDAS" },

  // ── LIMPIEZA ──
  { name: "Jabón líquido ropa", searchTerms: "jabon liquido ropa 3 litros", category: "LIMPIEZA", isEssential: true },
  { name: "Jabón en polvo", searchTerms: "jabon en polvo ropa 800g", category: "LIMPIEZA" },
  { name: "Suavizante", searchTerms: "suavizante ropa 900ml", category: "LIMPIEZA" },
  { name: "Limpiador de piso", searchTerms: "limpiador piso 900ml", category: "LIMPIEZA", isEssential: true },
  { name: "Limpiador cremoso", searchTerms: "limpiador cremoso 750ml", category: "LIMPIEZA" },
  { name: "Papel higiénico", searchTerms: "papel higienico 4 rollos", category: "LIMPIEZA", isEssential: true },
  { name: "Rollo de cocina", searchTerms: "rollo cocina x3", category: "LIMPIEZA" },
  { name: "Lavandina", searchTerms: "lavandina 1 litro", category: "LIMPIEZA", isEssential: true },
  { name: "Bolsas de residuo", searchTerms: "bolsas residuo consorcio x30", category: "LIMPIEZA" },
  { name: "Esponja multiuso", searchTerms: "esponja multiuso x3", category: "LIMPIEZA" },
  { name: "Detergente", searchTerms: "detergente lavavajillas 750ml", category: "LIMPIEZA", isEssential: true },
  { name: "Insecticida aerosol", searchTerms: "insecticida aerosol 360ml", category: "LIMPIEZA" },

  // ── PERFUMERIA ──
  { name: "Shampoo", searchTerms: "shampoo 340ml", category: "PERFUMERIA", isEssential: true },
  { name: "Acondicionador", searchTerms: "acondicionador 340ml", category: "PERFUMERIA" },
  { name: "Pasta dental", searchTerms: "pasta dental 90g", category: "PERFUMERIA", isEssential: true },
  { name: "Cepillo de dientes", searchTerms: "cepillo de dientes", category: "PERFUMERIA" },
  { name: "Jabón de tocador", searchTerms: "jabon tocador 90g", category: "PERFUMERIA", isEssential: true },
  { name: "Jabón líquido manos", searchTerms: "jabon liquido manos 250ml", category: "PERFUMERIA" },
  { name: "Desodorante", searchTerms: "desodorante aerosol 150ml", category: "PERFUMERIA", isEssential: true },
  { name: "Protector solar", searchTerms: "protector solar fps50 250ml", category: "PERFUMERIA" },
  { name: "Crema corporal", searchTerms: "crema corporal hidratante 400ml", category: "PERFUMERIA" },
  { name: "Alcohol etílico", searchTerms: "alcohol etilico 500ml", category: "PERFUMERIA" },
  { name: "Algodón", searchTerms: "algodon hidrofilo 100g", category: "PERFUMERIA" },
  { name: "Curitas", searchTerms: "curitas apositos x20", category: "PERFUMERIA" },
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

async function seedProductCatalog() {
  console.log("Seeding product catalog...");

  // Clear old branded products before seeding generic ones
  await prisma.productCatalog.deleteMany({});

  for (const product of productCatalog) {
    await prisma.productCatalog.upsert({
      where: { name: product.name },
      update: {
        searchTerms: product.searchTerms,
        category: product.category,
        isEssential: product.isEssential ?? false,
        isActive: product.isActive ?? true,
      },
      create: {
        name: product.name,
        searchTerms: product.searchTerms,
        category: product.category,
        isEssential: product.isEssential ?? false,
        isActive: product.isActive ?? true,
      },
    });
  }
  console.log(`  ✓ Seeded ${productCatalog.length} product catalog entries`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("🌱 Starting database seed...\n");

  await seedCatalog();
  await seedAchievements();
  await seedProductCatalog();

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
