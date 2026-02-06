import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingVerifications } from "@/components/features/pending-verifications";
import { KidsSummary } from "@/components/features/kids-summary";
import { Shield, Users, CheckCircle, AlertTriangle } from "lucide-react";

export default async function ParentalPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  // Only adults can access parental controls
  if (member.memberType !== "ADULT") {
    redirect("/dashboard");
  }

  // Get all kids and teens in the household
  const kids = await prisma.member.findMany({
    where: {
      householdId: member.householdId,
      memberType: { in: ["CHILD", "TEEN"] },
      isActive: true,
    },
    include: {
      level: true,
      assignments: {
        where: {
          status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
        },
        include: {
          task: { select: { name: true, weight: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  // Get tasks pending verification (completed by kids but not verified)
  const pendingVerification = await prisma.assignment.findMany({
    where: {
      householdId: member.householdId,
      status: "COMPLETED",
      member: {
        memberType: { in: ["CHILD", "TEEN"] },
      },
    },
    include: {
      task: { select: { id: true, name: true, weight: true } },
      member: { select: { id: true, name: true, memberType: true } },
    },
    orderBy: { completedAt: "desc" },
  });

  // Stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const kidsCompletedToday = await prisma.assignment.count({
    where: {
      householdId: member.householdId,
      member: { memberType: { in: ["CHILD", "TEEN"] } },
      status: { in: ["COMPLETED", "VERIFIED"] },
      completedAt: { gte: todayStart },
    },
  });

  const kidsPendingTasks = await prisma.assignment.count({
    where: {
      householdId: member.householdId,
      member: { memberType: { in: ["CHILD", "TEEN"] } },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
  });

  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Shield className="h-8 w-8" />
          Control parental
        </h1>
        <p className="text-muted-foreground">
          Supervisa y verifica las tareas de los niños
        </p>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Niños/Teens</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kids.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completadas hoy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kidsCompletedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kidsPendingTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Por verificar</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingVerification.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verifications */}
      {pendingVerification.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Tareas por verificar</h2>
          <PendingVerifications assignments={pendingVerification} />
        </section>
      )}

      {/* Kids Summary */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Resumen por niño</h2>
        {kids.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Sin niños en el hogar</p>
              <p className="text-muted-foreground">
                Agrega miembros tipo CHILD o TEEN para usar el control parental
              </p>
            </CardContent>
          </Card>
        ) : (
          <KidsSummary kids={kids} />
        )}
      </section>
    </div>
  );
}
