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
// FAMILY CONFIGS
// ============================================

interface FamilyMemberConfig {
  userId: string;
  email: string;
  userName: string;
  memberName: string;
  avatarSeed: string;
}

interface FamilyConfig {
  householdName: string;
  inviteCode: string;
  adult: FamilyMemberConfig;
  teen: FamilyMemberConfig;
  child: FamilyMemberConfig;
  levels: {
    adult: { level: number; xp: number };
    teen: { level: number; xp: number };
    child: { level: number; xp: number };
  };
  petName: string;
}

const FAMILY_ALEMANDI: FamilyConfig = {
  householdName: "Familia Alemandi",
  inviteCode: "TEST-ALEMANDI-001",
  adult: {
    userId: "dev-franco-alemandi",
    email: "franco.alemandi@aerolab.co",
    userName: "Franco Alemandi",
    memberName: "Franco",
    avatarSeed: "Franco",
  },
  teen: {
    userId: "dev-lucas-alemandi",
    email: "lucas.alemandi@test.com",
    userName: "Lucas Alemandi",
    memberName: "Lucas",
    avatarSeed: "Lucas",
  },
  child: {
    userId: "dev-valentina-alemandi",
    email: "valentina.alemandi@test.com",
    userName: "Valentina Alemandi",
    memberName: "Valentina",
    avatarSeed: "Valentina",
  },
  levels: {
    adult: { level: 8, xp: 780 },
    teen: { level: 5, xp: 420 },
    child: { level: 3, xp: 180 },
  },
  petName: "Max",
};

const FAMILY_CATALA: FamilyConfig = {
  householdName: "Familia Catalá",
  inviteCode: "TEST-CATALA-001",
  adult: {
    userId: "dev-martin-catala",
    email: "martin.catala@aerolab.co",
    userName: "Martín Catalá",
    memberName: "Martín",
    avatarSeed: "Martin",
  },
  teen: {
    userId: "dev-tomas-catala",
    email: "tomas.catala@test.com",
    userName: "Tomás Catalá",
    memberName: "Tomás",
    avatarSeed: "Tomas",
  },
  child: {
    userId: "dev-sofia-catala",
    email: "sofia.catala@test.com",
    userName: "Sofía Catalá",
    memberName: "Sofía",
    avatarSeed: "Sofia",
  },
  levels: {
    adult: { level: 10, xp: 1050 },
    teen: { level: 4, xp: 350 },
    child: { level: 2, xp: 120 },
  },
  petName: "Luna",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

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

async function seedFamily(config: FamilyConfig) {
  console.log(`\n--- Seeding ${config.householdName} ---`);

  // ============================================
  // USERS
  // ============================================
  console.log("Creating users...");

  const userAdult = await prisma.user.upsert({
    where: { email: config.adult.email },
    update: {},
    create: {
      id: config.adult.userId,
      email: config.adult.email,
      name: config.adult.userName,
      emailVerified: new Date(),
    },
  });

  const userTeen = await prisma.user.upsert({
    where: { email: config.teen.email },
    update: {},
    create: {
      id: config.teen.userId,
      email: config.teen.email,
      name: config.teen.userName,
      emailVerified: new Date(),
    },
  });

  const userChild = await prisma.user.upsert({
    where: { email: config.child.email },
    update: {},
    create: {
      id: config.child.userId,
      email: config.child.email,
      name: config.child.userName,
      emailVerified: new Date(),
    },
  });

  console.log(`  ✓ Created 3 users`);

  // ============================================
  // HOUSEHOLD
  // ============================================
  console.log("Creating household...");

  const household = await prisma.household.upsert({
    where: { inviteCode: config.inviteCode },
    update: {},
    create: {
      name: config.householdName,
      inviteCode: config.inviteCode,
    },
  });
  console.log(`  ✓ Created household: ${household.name}`);

  // ============================================
  // MEMBERS
  // ============================================
  console.log("Creating members...");

  const memberAdult = await prisma.member.upsert({
    where: { userId_householdId: { userId: userAdult.id, householdId: household.id } },
    update: {},
    create: {
      userId: userAdult.id,
      householdId: household.id,
      name: config.adult.memberName,
      memberType: "ADULT",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.adult.avatarSeed}`,
    },
  });

  const memberTeen = await prisma.member.upsert({
    where: { userId_householdId: { userId: userTeen.id, householdId: household.id } },
    update: {},
    create: {
      userId: userTeen.id,
      householdId: household.id,
      name: config.teen.memberName,
      memberType: "TEEN",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.teen.avatarSeed}`,
    },
  });

  const memberChild = await prisma.member.upsert({
    where: { userId_householdId: { userId: userChild.id, householdId: household.id } },
    update: {},
    create: {
      userId: userChild.id,
      householdId: household.id,
      name: config.child.memberName,
      memberType: "CHILD",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${config.child.avatarSeed}`,
    },
  });

  const members = [memberAdult, memberTeen, memberChild];
  console.log(`  ✓ Created ${members.length} members`);

  // ============================================
  // MEMBER LEVELS
  // ============================================
  console.log("Creating member levels...");

  await Promise.all([
    prisma.memberLevel.upsert({
      where: { memberId: memberAdult.id },
      update: {},
      create: { memberId: memberAdult.id, ...config.levels.adult },
    }),
    prisma.memberLevel.upsert({
      where: { memberId: memberTeen.id },
      update: {},
      create: { memberId: memberTeen.id, ...config.levels.teen },
    }),
    prisma.memberLevel.upsert({
      where: { memberId: memberChild.id },
      update: {},
      create: { memberId: memberChild.id, ...config.levels.child },
    }),
  ]);
  console.log(`  ✓ Created member levels`);

  // ============================================
  // TASKS
  // ============================================
  console.log("Creating tasks...");

  const tasksData = [
    { name: "Lavar platos", frequency: "DAILY" as const, weight: 2, estimatedMinutes: 15 },
    { name: "Preparar cena", frequency: "DAILY" as const, weight: 3, estimatedMinutes: 45 },
    { name: "Barrer sala", frequency: "WEEKLY" as const, weight: 2, estimatedMinutes: 15, minAge: 8 },
    { name: "Limpiar baños", frequency: "WEEKLY" as const, weight: 4, estimatedMinutes: 30 },
    { name: "Sacar basura", frequency: "BIWEEKLY" as const, weight: 1, estimatedMinutes: 5, minAge: 10 },
    { name: `Pasear a ${config.petName}`, frequency: "DAILY" as const, weight: 2, estimatedMinutes: 30, minAge: 12 },
    { name: "Hacer camas", frequency: "DAILY" as const, weight: 1, estimatedMinutes: 5, minAge: 6 },
    { name: "Ordenar habitación", frequency: "WEEKLY" as const, weight: 2, estimatedMinutes: 15, minAge: 6 },
    { name: "Poner lavadora", frequency: "WEEKLY" as const, weight: 2, estimatedMinutes: 10 },
    { name: "Ir al supermercado", frequency: "WEEKLY" as const, weight: 3, estimatedMinutes: 60 },
  ];

  const tasks = await Promise.all(
    tasksData.map((task) =>
      prisma.task.create({
        data: {
          householdId: household.id,
          name: task.name,
          frequency: task.frequency,
          weight: task.weight,
          estimatedMinutes: task.estimatedMinutes,
          minAge: task.minAge,
        },
      })
    )
  );
  console.log(`  ✓ Created ${tasks.length} tasks`);

  // ============================================
  // ASSIGNMENTS
  // ============================================
  console.log("Creating assignments...");

  const assignmentsData = [
    // Completed (past)
    { task: tasks[0]!, member: memberAdult, dueDate: daysAgo(3), status: "COMPLETED" as const, completedAt: daysAgo(3), pointsEarned: 24 },
    { task: tasks[1]!, member: memberAdult, dueDate: daysAgo(2), status: "COMPLETED" as const, completedAt: daysAgo(2), pointsEarned: 36 },
    { task: tasks[6]!, member: memberChild, dueDate: daysAgo(1), status: "COMPLETED" as const, completedAt: daysAgo(1), pointsEarned: 12 },
    { task: tasks[5]!, member: memberTeen, dueDate: daysAgo(1), status: "VERIFIED" as const, completedAt: daysAgo(1), pointsEarned: 28 },

    // Pending (today and future)
    { task: tasks[0]!, member: memberTeen, dueDate: daysFromNow(0), status: "PENDING" as const },
    { task: tasks[2]!, member: memberChild, dueDate: daysFromNow(0), status: "IN_PROGRESS" as const },
    { task: tasks[3]!, member: memberAdult, dueDate: daysFromNow(1), status: "PENDING" as const },
    { task: tasks[4]!, member: memberTeen, dueDate: daysFromNow(2), status: "PENDING" as const },
    { task: tasks[8]!, member: memberAdult, dueDate: daysFromNow(3), status: "PENDING" as const },
    { task: tasks[9]!, member: memberAdult, dueDate: daysFromNow(4), status: "PENDING" as const },

    // Overdue
    { task: tasks[7]!, member: memberTeen, dueDate: daysAgo(2), status: "OVERDUE" as const },
  ];

  const assignments = await Promise.all(
    assignmentsData.map((assignment) =>
      prisma.assignment.create({
        data: {
          taskId: assignment.task.id,
          memberId: assignment.member.id,
          householdId: household.id,
          dueDate: assignment.dueDate,
          status: assignment.status,
          completedAt: assignment.completedAt,
          pointsEarned: assignment.pointsEarned,
        },
      })
    )
  );
  console.log(`  ✓ Created ${assignments.length} assignments`);

  // ============================================
  // MEMBER ACHIEVEMENTS
  // ============================================
  console.log("Creating member achievements...");

  const allAchievements = await prisma.achievement.findMany();
  const firstTaskAchievement = allAchievements.find((a) => a.code === "FIRST_TASK");
  const tasks10Achievement = allAchievements.find((a) => a.code === "TASKS_10");
  const level5Achievement = allAchievements.find((a) => a.code === "LEVEL_5");

  if (firstTaskAchievement) {
    await Promise.all(
      members.map((member) =>
        prisma.memberAchievement.upsert({
          where: { memberId_achievementId: { memberId: member.id, achievementId: firstTaskAchievement.id } },
          update: {},
          create: { memberId: member.id, achievementId: firstTaskAchievement.id, unlockedAt: daysAgo(30) },
        })
      )
    );
  }

  if (tasks10Achievement) {
    await prisma.memberAchievement.upsert({
      where: { memberId_achievementId: { memberId: memberAdult.id, achievementId: tasks10Achievement.id } },
      update: {},
      create: { memberId: memberAdult.id, achievementId: tasks10Achievement.id, unlockedAt: daysAgo(10) },
    });
  }

  if (level5Achievement && config.levels.teen.level >= 5) {
    await prisma.memberAchievement.upsert({
      where: { memberId_achievementId: { memberId: memberTeen.id, achievementId: level5Achievement.id } },
      update: {},
      create: { memberId: memberTeen.id, achievementId: level5Achievement.id, unlockedAt: daysAgo(5) },
    });
  }
  console.log(`  ✓ Created member achievements`);

  // ============================================
  // HOUSEHOLD REWARDS
  // ============================================
  console.log("Creating household rewards...");

  const rewards = await Promise.all([
    prisma.householdReward.create({
      data: {
        householdId: household.id,
        name: "Elegir película del viernes",
        description: "Elige qué película ver en la noche de películas familiar",
        pointsCost: 50,
      },
    }),
    prisma.householdReward.create({
      data: {
        householdId: household.id,
        name: "30 min extra de videojuegos",
        description: "30 minutos adicionales de tiempo de pantalla",
        pointsCost: 30,
      },
    }),
    prisma.householdReward.create({
      data: {
        householdId: household.id,
        name: "Desayuno en la cama",
        description: "Te preparan el desayuno y te lo llevan a la cama",
        pointsCost: 100,
      },
    }),
    prisma.householdReward.create({
      data: {
        householdId: household.id,
        name: "Día libre de tareas",
        description: "Un día sin ninguna tarea asignada",
        pointsCost: 150,
      },
    }),
    prisma.householdReward.create({
      data: {
        householdId: household.id,
        name: "Salida a helados",
        description: "Paseo familiar a la heladería",
        pointsCost: 200,
        isAiGenerated: true,
      },
    }),
  ]);
  console.log(`  ✓ Created ${rewards.length} rewards`);

  // ============================================
  // REWARD REDEMPTIONS
  // ============================================
  console.log("Creating reward redemptions...");

  await Promise.all([
    prisma.rewardRedemption.create({
      data: {
        memberId: memberTeen.id,
        rewardId: rewards[1]!.id,
        redeemedAt: daysAgo(5),
        isFulfilled: true,
      },
    }),
    prisma.rewardRedemption.create({
      data: {
        memberId: memberChild.id,
        rewardId: rewards[0]!.id,
        redeemedAt: daysAgo(2),
        isFulfilled: true,
      },
    }),
    prisma.rewardRedemption.create({
      data: {
        memberId: memberAdult.id,
        rewardId: rewards[2]!.id,
        redeemedAt: daysAgo(1),
        isFulfilled: false,
      },
    }),
  ]);
  console.log(`  ✓ Created reward redemptions`);

  // ============================================
  // MEMBER PREFERENCES
  // ============================================
  console.log("Creating member preferences...");

  await Promise.all([
    prisma.memberPreference.create({
      data: { memberId: memberAdult.id, taskId: tasks[1]!.id, preference: "PREFERRED" },
    }),
    prisma.memberPreference.create({
      data: { memberId: memberAdult.id, taskId: tasks[3]!.id, preference: "DISLIKED" },
    }),
    prisma.memberPreference.create({
      data: { memberId: memberTeen.id, taskId: tasks[5]!.id, preference: "PREFERRED" },
    }),
    prisma.memberPreference.create({
      data: { memberId: memberTeen.id, taskId: tasks[0]!.id, preference: "DISLIKED" },
    }),
    prisma.memberPreference.create({
      data: { memberId: memberChild.id, taskId: tasks[6]!.id, preference: "PREFERRED" },
    }),
  ]);
  console.log(`  ✓ Created member preferences`);

  // ============================================
  // MEMBER ABSENCES
  // ============================================
  console.log("Creating member absences...");

  await Promise.all([
    prisma.memberAbsence.create({
      data: {
        memberId: memberAdult.id,
        startDate: daysFromNow(10),
        endDate: daysFromNow(14),
        reason: "Viaje de trabajo",
        policy: "AUTO",
      },
    }),
    prisma.memberAbsence.create({
      data: {
        memberId: memberTeen.id,
        startDate: daysFromNow(20),
        endDate: daysFromNow(22),
        reason: "Campamento escolar",
        policy: "SPECIFIC",
        assignToMemberId: memberChild.id,
      },
    }),
  ]);
  console.log(`  ✓ Created member absences`);

  // ============================================
  // TASK TRANSFERS
  // ============================================
  console.log("Creating task transfers...");

  const pendingAssignment = assignments.find((a) => a.status === "PENDING" && a.memberId === memberTeen.id);
  if (pendingAssignment) {
    await prisma.taskTransfer.create({
      data: {
        assignmentId: pendingAssignment.id,
        fromMemberId: memberTeen.id,
        toMemberId: memberChild.id,
        reason: "Tengo mucha tarea hoy",
        status: "PENDING",
      },
    });
  }
  console.log(`  ✓ Created task transfers`);

  // ============================================
  // TASK ROTATIONS
  // ============================================
  console.log("Creating task rotations...");

  await Promise.all([
    prisma.taskRotation.create({
      data: {
        taskId: tasks[0]!.id,
        householdId: household.id,
        frequency: "DAILY",
        isActive: true,
        lastGenerated: daysAgo(1),
        nextDueDate: daysFromNow(1),
      },
    }),
    prisma.taskRotation.create({
      data: {
        taskId: tasks[3]!.id,
        householdId: household.id,
        frequency: "WEEKLY",
        isActive: true,
        lastGenerated: daysAgo(7),
        nextDueDate: daysFromNow(0),
      },
    }),
  ]);
  console.log(`  ✓ Created task rotations`);

  // ============================================
  // TASK REMINDERS
  // ============================================
  console.log("Creating task reminders...");

  const activeAssignments = assignments.filter(
    (a) => a.status === "PENDING" || a.status === "IN_PROGRESS"
  );

  for (const assignment of activeAssignments.slice(0, 3)) {
    await prisma.taskReminder.create({
      data: {
        assignmentId: assignment.id,
        memberId: assignment.memberId,
        reminderType: "DUE_SOON",
        scheduledFor: daysFromNow(0),
      },
    });
  }
  console.log(`  ✓ Created task reminders`);

  // ============================================
  // COMPETITIONS
  // ============================================
  console.log("Creating competitions...");

  const competition = await prisma.competition.create({
    data: {
      householdId: household.id,
      name: "Desafío de la Semana",
      description: "¿Quién completa más tareas esta semana?",
      duration: "WEEK",
      prize: "Elegir el restaurante del domingo",
      status: "ACTIVE",
      startDate: daysAgo(3),
      endDate: daysFromNow(4),
    },
  });
  console.log(`  ✓ Created competition: ${competition.name}`);

  // ============================================
  // COMPETITION SCORES
  // ============================================
  console.log("Creating competition scores...");

  await Promise.all([
    prisma.competitionScore.create({
      data: { competitionId: competition.id, memberId: memberAdult.id, points: 120, tasksCompleted: 5 },
    }),
    prisma.competitionScore.create({
      data: { competitionId: competition.id, memberId: memberTeen.id, points: 85, tasksCompleted: 4 },
    }),
    prisma.competitionScore.create({
      data: { competitionId: competition.id, memberId: memberChild.id, points: 60, tasksCompleted: 3 },
    }),
  ]);
  console.log(`  ✓ Created competition scores`);


  // ============================================
  // WEEKLY PLAN (AI)
  // ============================================
  console.log("Creating weekly plan...");

  await prisma.weeklyPlan.create({
    data: {
      householdId: household.id,
      status: "PENDING",
      balanceScore: 85,
      notes: [
        `${config.adult.memberName} tiene más tareas de cocina por preferencia`,
        `${config.teen.memberName} se encarga de pasear a ${config.petName}`,
        `${config.child.memberName} tiene tareas apropiadas para su edad`,
      ],
      assignments: [
        { taskName: "Lavar platos", memberName: config.teen.memberName, memberType: "TEEN", reason: "Rotación equitativa" },
        { taskName: "Preparar cena", memberName: config.adult.memberName, memberType: "ADULT", reason: "Preferencia del miembro" },
        { taskName: "Barrer sala", memberName: config.child.memberName, memberType: "CHILD", reason: "Tarea apropiada para edad" },
        { taskName: "Limpiar baños", memberName: config.adult.memberName, memberType: "ADULT", reason: "Rotación equitativa" },
        { taskName: `Pasear a ${config.petName}`, memberName: config.teen.memberName, memberType: "TEEN", reason: "Preferencia del miembro" },
      ],
      durationDays: 7,
      expiresAt: daysFromNow(2),
    },
  });
  console.log(`  ✓ Created weekly plan`);

  console.log(`\n✅ ${config.householdName} seeded!`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("🌱 Starting database seed...\n");

  await seedCatalog();
  await seedAchievements();
  await seedFamily(FAMILY_ALEMANDI);
  await seedFamily(FAMILY_CATALA);

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
