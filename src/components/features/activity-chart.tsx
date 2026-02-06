"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface DailyData {
  date: string;
  count: number;
}

interface ActivityChartProps {
  data: DailyData[];
  completedThisWeek?: number;
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getDayName(dateString: string): string {
  const date = new Date(dateString);
  return DAYS[date.getDay()] ?? "";
}

export function ActivityChart({ data, completedThisWeek }: ActivityChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Actividad semanal
          </CardTitle>
          {completedThisWeek !== undefined && (
            <span className="text-sm font-semibold text-[var(--color-success)]">
              {completedThisWeek} esta semana
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end justify-between gap-2">
          {data.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-primary transition-all duration-300"
                style={{
                  height: `${(day.count / maxCount) * 100}%`,
                  minHeight: day.count > 0 ? "8px" : "2px",
                }}
              />
              <span className="text-xs text-muted-foreground">
                {getDayName(day.date)}
              </span>
              <span className="text-xs font-medium">{day.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
