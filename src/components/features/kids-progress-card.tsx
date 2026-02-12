"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface KidsProgressCardProps {
  completedToday: number;
}

export function KidsProgressCard({ completedToday }: KidsProgressCardProps) {
  return (
    <Card className="overflow-hidden border-4 border-yellow-400 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900">
      <CardContent className="p-6">
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-green-200 p-4 dark:bg-green-800">
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
      </CardContent>
    </Card>
  );
}
