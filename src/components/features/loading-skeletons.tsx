"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { spacing, radius } from "@/lib/design-tokens";

export function DashboardSkeleton() {
  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      {/* Header */}
      <div className={spacing.pageHeader}>
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Two columns on lg: main content + sidebar (stats) */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 space-y-4 lg:mt-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={`h-24 ${radius.cardCompact}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-9 w-24" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-3 h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className={`${spacing.pageHeader} flex items-center gap-6`}>
        <Skeleton className="h-24 w-24 rounded-full" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-5 w-32" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className={spacing.pageHeader}>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-lg dark:bg-card">
        {/* Top bar */}
        <div className="flex items-center justify-between bg-primary/80 px-4 py-3 sm:px-6 sm:py-4">
          <Skeleton className="h-8 w-8 rounded-full bg-white/20" />
          <Skeleton className="h-5 w-36 bg-white/20" />
          <Skeleton className="h-8 w-8 rounded-full bg-white/20" />
        </div>
        {/* Desktop: header row + day numbers + cells */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-7 border-b border-border/30">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex justify-center py-2">
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-b border-border/20">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex justify-center py-1.5">
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="min-h-[100px] border-b border-border/15 p-2">
                <Skeleton className="mb-1.5 h-14 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
        {/* Mobile: stacked day rows */}
        <div className="sm:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-b border-border/20 px-4 py-3">
              <div className="mb-2 flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2 pl-0.5">
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <div className={spacing.pageHeader}>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: items }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-6">
              <Skeleton className="mx-auto mb-3 h-12 w-12 rounded-full" />
              <Skeleton className="mx-auto mb-2 h-5 w-24" />
              <Skeleton className="mx-auto h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
