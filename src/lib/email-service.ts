import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL
  ? process.env.FROM_EMAIL
  : "Habita <onboarding@resend.dev>";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://habita.app";

// ============================================
// SHARED DESIGN SYSTEM
// ============================================

const COLORS = {
  primary: "#5260fe",
  primaryDark: "#3d4adb",
  text: "#1a1a2e",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  bg: "#f4f4f5",
  cardBg: "#ffffff",
  border: "#e5e7eb",
  green: "#16a34a",
  greenBg: "#dcfce7",
  red: "#dc2626",
  redBg: "#fef2f2",
  yellow: "#ca8a04",
  yellowBg: "#fef9c3",
  blueBg: "#eff6ff",
} as const;

function wrapEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg}">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <!-- Header -->
        <tr><td style="padding:24px 32px;background:${COLORS.primary};border-radius:12px 12px 0 0">
          <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">Habita</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:${COLORS.cardBg};padding:32px;border-radius:0 0 12px 12px">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 32px;text-align:center">
          <p style="margin:0;font-size:13px;color:${COLORS.textMuted};line-height:1.5">
            Hecho con cuidado por el equipo de Habita
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
    <tr><td style="background:${COLORS.primary};border-radius:8px;padding:12px 28px">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:inline-block">${label}</a>
    </td></tr>
  </table>`;
}

function statCard(value: string, label: string, bgColor: string, textColor: string): string {
  return `<td style="background:${bgColor};border-radius:8px;padding:14px 8px;text-align:center;width:33%">
    <div style="font-size:26px;font-weight:700;color:${textColor};line-height:1">${value}</div>
    <div style="font-size:12px;color:${COLORS.textSecondary};margin-top:4px">${label}</div>
  </td>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${COLORS.border};margin:24px 0">`;
}

function sectionTitle(text: string): string {
  return `<h3 style="font-size:14px;font-weight:600;color:${COLORS.textSecondary};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px">${text}</h3>`;
}

// ============================================
// SHARED UTILITIES
// ============================================

/**
 * Format a date in a household's timezone for display in emails.
 */
export function formatLocalDate(date: Date, timezone?: string | null): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: timezone ?? undefined,
    }).format(date);
  } catch {
    return date.toLocaleDateString("es-AR");
  }
}

function groupByMember(
  assignments: Array<{ taskName: string; memberName: string }>
): Array<{ memberName: string; tasks: string[]; count: number }> {
  const grouped = new Map<string, string[]>();

  for (const a of assignments) {
    const tasks = grouped.get(a.memberName) ?? [];
    tasks.push(a.taskName);
    grouped.set(a.memberName, tasks);
  }

  return Array.from(grouped.entries()).map(([memberName, tasks]) => ({
    memberName,
    tasks,
    count: tasks.length,
  }));
}

function buildAssignmentTableHtml(
  assignments: Array<{ taskName: string; memberName: string }>
): string {
  const groups = groupByMember(assignments);
  const totalTasks = assignments.length;

  const rows = groups
    .map(
      (g) =>
        `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-weight:500;color:${COLORS.text}">${g.memberName}</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};color:${COLORS.textSecondary}">${g.tasks.join(", ")}</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};text-align:center;font-weight:600;color:${COLORS.primary}">${g.count}</td>
        </tr>`
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:12px 0">
      <thead>
        <tr>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${COLORS.border}">Miembro</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${COLORS.border}">Tareas</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${COLORS.border}">Cant.</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td style="padding:10px 12px;font-weight:700;color:${COLORS.text}" colspan="2">Total</td>
          <td style="padding:10px 12px;font-weight:700;text-align:center;color:${COLORS.primary}">${totalTasks}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

// ============================================
// PLAN SUMMARY EMAIL (cron auto-generated)
// ============================================

interface PlanSummaryEmailParams {
  householdName: string;
  balanceScore: number;
  assignments: Array<{ taskName: string; memberName: string }>;
  localDateLabel: string;
}

export async function sendPlanSummaryEmail(
  email: string,
  params: PlanSummaryEmailParams
): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Las tareas de la semana en ${params.householdName}`,
      html: buildPlanSummaryHtml(params),
    });
  } catch (error) {
    console.error("Failed to send plan summary email:", error);
  }
}

export async function sendPlanSummaryToAdults(
  adults: Array<{ email: string; memberName: string }>,
  params: PlanSummaryEmailParams
): Promise<void> {
  if (!resend || adults.length === 0) return;

  console.log(`Sending plan-summary email to ${adults.length} adults:`, adults.map((a) => a.email).join(", "));

  const results = await Promise.allSettled(
    adults.map((adult) => sendPlanSummaryEmail(adult.email, params))
  );

  for (const [idx, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error(`Plan-summary email failed for ${adults[idx]?.email}:`, result.reason);
    }
  }
}

function buildPlanSummaryHtml(params: PlanSummaryEmailParams): string {
  const { householdName, balanceScore, assignments, localDateLabel } = params;

  const scoreColor = balanceScore >= 70 ? COLORS.green : balanceScore >= 40 ? COLORS.yellow : COLORS.red;
  const scoreBg = balanceScore >= 70 ? COLORS.greenBg : balanceScore >= 40 ? COLORS.yellowBg : COLORS.redBg;
  const scoreLabel = balanceScore >= 70 ? "Muy equilibrado" : balanceScore >= 40 ? "Aceptable" : "Poco equilibrado";

  return wrapEmail(`
    <h1 style="font-size:22px;color:${COLORS.text};margin:0 0 4px;font-weight:700">Las tareas de la semana</h1>
    <p style="color:${COLORS.textSecondary};margin:0 0 24px;font-size:15px">${householdName} &middot; ${localDateLabel}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 8px">
      <tr>
        <td style="background:${scoreBg};border-radius:8px;padding:14px 16px">
          <span style="font-size:14px;color:${COLORS.textSecondary}">Equilibrio de distribución</span>
          <span style="float:right;font-weight:700;font-size:20px;color:${scoreColor}">${balanceScore}%</span>
          <div style="font-size:12px;color:${scoreColor};margin-top:2px">${scoreLabel}</div>
        </td>
      </tr>
    </table>

    ${divider()}
    ${sectionTitle("Distribución por miembro")}
    ${buildAssignmentTableHtml(assignments)}

    <p style="color:${COLORS.textSecondary};font-size:14px;line-height:1.6;margin:16px 0 0">
      Ya están organizadas las tareas para la próxima semana. Cada pequeña tarea suma para que el hogar funcione mejor.
    </p>

    ${ctaButton("Ver mis tareas", `${APP_URL}/my-tasks`)}
  `);
}

// ============================================
// WELCOME EMAIL
// ============================================

interface WelcomeEmailParams {
  memberName: string;
  householdName: string;
  isNewHousehold: boolean;
  inviteCode?: string;
}

/**
 * Send a welcome email when a user creates or joins a household.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendWelcomeEmail(
  email: string,
  params: WelcomeEmailParams
): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not configured, skipping welcome email");
    return;
  }

  const subject = params.isNewHousehold
    ? "Te damos la bienvenida a Habita"
    : `Ya sos parte de ${params.householdName}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: buildWelcomeHtml(params),
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
}

function buildWelcomeHtml(params: WelcomeEmailParams): string {
  const { memberName, householdName, isNewHousehold, inviteCode } = params;

  const greeting = isNewHousehold
    ? `Creaste <strong>${householdName}</strong> y ya está todo listo para empezar.`
    : `Te uniste a <strong>${householdName}</strong>. El equipo te estaba esperando.`;

  const inviteUrl = inviteCode ? `${APP_URL}/join/${inviteCode}` : "";

  const inviteBlock = isNewHousehold && inviteCode
    ? `${divider()}
      ${sectionTitle("Invitá a tu familia")}
      <p style="color:${COLORS.textSecondary};font-size:14px;margin:0 0 12px">Compartí este link para que se unan al hogar:</p>
      ${ctaButton("Compartir link de invitación", inviteUrl)}
      <p style="color:${COLORS.textMuted};font-size:12px;text-align:center;margin:0">o usá el código: <strong style="letter-spacing:2px">${inviteCode}</strong></p>`
    : "";

  const steps = isNewHousehold
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0">
        <tr><td style="padding:8px 0;color:${COLORS.textSecondary};font-size:14px;line-height:1.5">
          <strong style="color:${COLORS.primary}">1.</strong>&nbsp; Revisá las tareas que se crearon con tu hogar
        </td></tr>
        <tr><td style="padding:8px 0;color:${COLORS.textSecondary};font-size:14px;line-height:1.5">
          <strong style="color:${COLORS.primary}">2.</strong>&nbsp; Invitá a los miembros de tu familia con el link
        </td></tr>
        <tr><td style="padding:8px 0;color:${COLORS.textSecondary};font-size:14px;line-height:1.5">
          <strong style="color:${COLORS.primary}">3.</strong>&nbsp; Generá el primer plan semanal para distribuir tareas
        </td></tr>
      </table>`
    : `<p style="color:${COLORS.textSecondary};font-size:14px;line-height:1.6;margin:8px 0">
        Desde ahora vas a poder ver tus tareas asignadas, completarlas y ganar puntos junto a tu familia.
      </p>`;

  return wrapEmail(`
    <h1 style="font-size:22px;color:${COLORS.text};margin:0 0 8px;font-weight:700">Hola, ${memberName}</h1>
    <p style="color:${COLORS.textSecondary};font-size:16px;line-height:1.5;margin:0 0 20px">${greeting}</p>

    ${divider()}
    ${sectionTitle(isNewHousehold ? "Primeros pasos" : "¿Qué sigue?")}
    ${steps}

    ${ctaButton("Ir a Habita", `${APP_URL}/dashboard`)}

    ${inviteBlock}
  `);
}

// ============================================
// PLAN APPLIED EMAIL (manual apply)
// ============================================

interface PlanAppliedEmailParams {
  householdName: string;
  assignmentsCount: number;
  assignments: Array<{ taskName: string; memberName: string }>;
  appliedByMemberName: string;
}

/**
 * Send plan-applied email to all adult members.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendPlanAppliedToAdults(
  adults: Array<{ email: string }>,
  params: PlanAppliedEmailParams
): Promise<void> {
  if (!resend || adults.length === 0) return;

  console.log(`Sending plan-applied email to ${adults.length} adults:`, adults.map((a) => a.email).join(", "));

  const results = await Promise.allSettled(
    adults.map((adult) => sendPlanAppliedEmail(adult.email, params))
  );

  for (const [idx, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error(`Plan-applied email failed for ${adults[idx]?.email}:`, result.reason);
    }
  }
}

async function sendPlanAppliedEmail(
  email: string,
  params: PlanAppliedEmailParams
): Promise<void> {
  if (!resend) return;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Nuevas tareas asignadas en ${params.householdName}`,
    html: buildPlanAppliedHtml(params),
  });
}

function buildPlanAppliedHtml(params: PlanAppliedEmailParams): string {
  const { householdName, assignmentsCount, assignments, appliedByMemberName } = params;

  return wrapEmail(`
    <h1 style="font-size:22px;color:${COLORS.text};margin:0 0 4px;font-weight:700">Se organizaron las tareas de la semana</h1>
    <p style="color:${COLORS.textSecondary};margin:0 0 24px;font-size:15px">${householdName} &middot; Aplicado por ${appliedByMemberName}</p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
      <tr>
        <td style="background:${COLORS.blueBg};border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:${COLORS.primary};line-height:1">${assignmentsCount}</div>
          <div style="font-size:13px;color:${COLORS.textSecondary};margin-top:4px">tareas asignadas</div>
        </td>
      </tr>
    </table>

    ${divider()}
    ${sectionTitle("Distribución por miembro")}
    ${buildAssignmentTableHtml(assignments)}

    <p style="color:${COLORS.textSecondary};font-size:14px;line-height:1.6;margin:16px 0 0">
      Cada tarea completada suma puntos y acerca al equipo a sus recompensas. ¡A por la semana!
    </p>

    ${ctaButton("Ver mis tareas", `${APP_URL}/my-tasks`)}
  `);
}

// ============================================
// WEEKLY INSIGHTS EMAIL
// ============================================

interface WeeklyInsightsEmailParams {
  householdName: string;
  localDateLabel: string;
  memberStats: Array<{
    memberName: string;
    level: number;
    weeklyCompleted: number;
  }>;
  totals: {
    completedThisWeek: number;
    pendingCount: number;
    overdueCount: number;
  };
  dailyCompletions: Array<{ date: string; count: number }>;
  recentAchievements: Array<{ memberName: string; achievementName: string }>;
}

/**
 * Send weekly insights email to all adult members.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendWeeklyInsightsToAdults(
  adults: Array<{ email: string }>,
  params: WeeklyInsightsEmailParams
): Promise<void> {
  if (!resend || adults.length === 0) return;

  await Promise.allSettled(
    adults.map((adult) => sendWeeklyInsightsEmail(adult.email, params))
  );
}

async function sendWeeklyInsightsEmail(
  email: string,
  params: WeeklyInsightsEmailParams
): Promise<void> {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Así fue la semana en ${params.householdName}`,
      html: buildWeeklyInsightsHtml(params),
    });
  } catch (error) {
    console.error("Failed to send weekly insights email:", error);
  }
}

function buildWeeklyInsightsHtml(params: WeeklyInsightsEmailParams): string {
  const { householdName, localDateLabel, memberStats, totals, dailyCompletions, recentAchievements } = params;

  const overdueColor = totals.overdueCount > 0 ? COLORS.red : COLORS.green;
  const overdueBg = totals.overdueCount > 0 ? COLORS.redBg : COLORS.greenBg;

  // Highlight message
  const highlightMsg = totals.completedThisWeek > 0
    ? `Completaron <strong>${totals.completedThisWeek} tarea${totals.completedThisWeek === 1 ? "" : "s"}</strong> esta semana. ¡Buen trabajo, equipo!`
    : "Esta semana no se completaron tareas. ¡La próxima va a ser diferente!";

  // Totals cards
  const totalsBlock = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-collapse:separate;border-spacing:8px 0">
      <tr>
        ${statCard(String(totals.completedThisWeek), "Completadas", COLORS.greenBg, COLORS.green)}
        ${statCard(String(totals.pendingCount), "Pendientes", COLORS.blueBg, COLORS.primary)}
        ${statCard(String(totals.overdueCount), "Atrasadas", overdueBg, overdueColor)}
      </tr>
    </table>
  `;

  // Leaderboard
  const sortedStats = [...memberStats].sort((a, b) => b.weeklyCompleted - a.weeklyCompleted);
  const leaderboardRows = sortedStats
    .map(
      (m, i) => {
        const medal = i === 0 && m.weeklyCompleted > 0 ? "&#9733; " : "";
        return `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-weight:500;color:${COLORS.text}">${medal}${m.memberName}</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};text-align:center;color:${COLORS.textSecondary}">Nv.${m.level}</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};text-align:center;font-weight:600;color:${COLORS.primary}">${m.weeklyCompleted}</td>
        </tr>`;
      }
    )
    .join("");

  const leaderboardTable = `
    <table style="width:100%;border-collapse:collapse;margin:12px 0">
      <thead>
        <tr>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${COLORS.border}">Miembro</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${COLORS.border}">Nivel</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ${COLORS.border}">Semana</th>
        </tr>
      </thead>
      <tbody>${leaderboardRows}</tbody>
    </table>
  `;

  // Daily activity bars
  const maxDaily = Math.max(...dailyCompletions.map((d) => d.count), 1);
  const dayNames = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const dailyBars = dailyCompletions
    .map((d) => {
      const dayOfWeek = new Date(d.date + "T12:00:00").getDay();
      const label = dayNames[dayOfWeek] ?? d.date.slice(5);
      const widthPct = Math.max((d.count / maxDaily) * 100, 4);
      const barColor = d.count > 0 ? COLORS.primary : COLORS.border;
      return `<tr>
        <td style="width:36px;font-size:12px;color:${COLORS.textMuted};text-align:right;padding:3px 8px 3px 0;font-weight:500">${label}</td>
        <td style="padding:3px 0">
          <div style="background:${COLORS.bg};border-radius:4px;height:22px;overflow:hidden">
            <div style="width:${widthPct}%;background:${barColor};height:100%;border-radius:4px;transition:width 0.3s"></div>
          </div>
        </td>
        <td style="width:28px;font-size:13px;color:${COLORS.text};font-weight:600;padding:3px 0 3px 8px">${d.count}</td>
      </tr>`;
    })
    .join("");

  const dailyBlock = `
    <table style="width:100%;border-collapse:collapse">${dailyBars}</table>
  `;

  // Achievements
  const achievementsBlock = recentAchievements.length > 0
    ? `${divider()}
      ${sectionTitle("Logros desbloqueados")}
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        <tr><td style="background:${COLORS.yellowBg};border-radius:8px;padding:14px 16px">
          ${recentAchievements.map((a) => `<p style="margin:4px 0;font-size:14px;color:${COLORS.yellow}">&#9733; <strong>${a.memberName}</strong> desbloqueó <em>${a.achievementName}</em></p>`).join("")}
        </td></tr>
      </table>`
    : "";

  // Closing message
  const closingMsg = totals.completedThisWeek > 5
    ? "Fue una semana productiva. ¡Sigan así!"
    : "La próxima semana arranca con un plan nuevo. ¡Éxitos!";

  return wrapEmail(`
    <h1 style="font-size:22px;color:${COLORS.text};margin:0 0 4px;font-weight:700">Así fue la semana</h1>
    <p style="color:${COLORS.textSecondary};margin:0 0 8px;font-size:15px">${householdName} &middot; ${localDateLabel}</p>
    <p style="color:${COLORS.text};font-size:15px;line-height:1.5;margin:8px 0 20px">${highlightMsg}</p>

    ${totalsBlock}

    ${divider()}
    ${sectionTitle("Tabla de la semana")}
    ${leaderboardTable}

    ${divider()}
    ${sectionTitle("Actividad diaria")}
    ${dailyBlock}

    ${achievementsBlock}

    ${divider()}
    <p style="color:${COLORS.textSecondary};font-size:14px;line-height:1.6;margin:0">${closingMsg}</p>

    ${ctaButton("Ver el dashboard", `${APP_URL}/dashboard`)}
  `);
}
