"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, Trophy, Sparkles } from "lucide-react";

interface Achievement {
  name: string;
  iconUrl: string | null;
}

interface KidsProgressCardProps {
  level: number;
  xpProgress: number;
  xpForNextLevel: number;
  completedToday: number;
  recentAchievements: Achievement[];
}

export function KidsProgressCard({
  level,
  xpProgress,
  xpForNextLevel,
  completedToday,
  recentAchievements,
}: KidsProgressCardProps) {
  const progressPercent = Math.round((xpProgress / xpForNextLevel) * 100);

  return (
    <Card className="overflow-hidden border-4 border-yellow-400 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Level */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 text-4xl font-bold text-yellow-900 shadow-lg">
              {level}
            </div>
            <div>
              <p className="text-lg font-medium text-muted-foreground">Nivel</p>
              <div className="mt-1 flex items-center gap-2">
                <Progress value={progressPercent} className="h-4 w-32" />
                <span className="text-sm font-medium">
                  {xpProgress}/{xpForNextLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Today's progress */}
          <div className="flex items-center gap-3 rounded-2xl bg-green-200 p-4 dark:bg-green-800">
            <Star className="h-10 w-10 text-green-600 dark:text-green-300" />
            <div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-200">
                {completedToday}
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                completadas hoy
              </p>
            </div>
          </div>

          {/* Recent achievements */}
          {recentAchievements.length > 0 && (
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-purple-500" />
              <div className="flex gap-2">
                {recentAchievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-200 dark:bg-purple-800"
                    title={achievement.name}
                  >
                    <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
