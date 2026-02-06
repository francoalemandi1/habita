"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";

import type { MemberType } from "@prisma/client";

interface LeaderboardMember {
  id: string;
  name: string;
  memberType: MemberType;
  level: number;
  xp: number;
  weeklyTasks: number;
  monthlyTasks: number;
  totalTasks: number;
}

interface LeaderboardProps {
  members: LeaderboardMember[];
  currentMemberId?: string;
}

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  ADULT: "Adulto",
  TEEN: "Adolescente",
  CHILD: "Niño",
};

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="flex h-5 w-5 items-center justify-center text-sm font-medium text-muted-foreground">{rank}</span>;
  }
}

export function Leaderboard({ members, currentMemberId }: LeaderboardProps) {
  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No hay miembros en el hogar</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Trophy className="h-5 w-5 text-[var(--color-level)]" />
          Tabla de posiciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map((member, index) => (
            <div
              key={member.id}
              className={`flex items-center justify-between gap-2 rounded-2xl border-2 p-3 transition-colors ${
                member.id === currentMemberId
                  ? "border-primary bg-primary/10"
                  : "border-border/60 bg-card"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                  {getRankIcon(index + 1)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{member.name}</span>
                    {member.id === currentMemberId && (
                      <Badge className="text-xs">Tú</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <span>{MEMBER_TYPE_LABELS[member.memberType]}</span>
                    <span>·</span>
                    <span>Nivel {member.level}</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-[var(--color-xp)]">{member.xp} XP</div>
                <div className="text-xs text-muted-foreground">{member.weeklyTasks} esta sem.</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
