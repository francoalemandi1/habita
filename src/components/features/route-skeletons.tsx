import { Skeleton } from "@/components/ds/skeleton";

/**
 * Route-level `loading.tsx` fallbacks — static ds Skeleton blocks matching
 * each screen's real layout (handoff §6.20: no shimmer, no spinners).
 */

export function CasaSkeleton(): React.JSX.Element {
  return (
    <div className="container max-w-4xl space-y-4 px-4 py-6 sm:py-8 md:px-8">
      <div className="mb-2 flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.25fr_1fr]">
        <Skeleton className="h-80 w-full rounded-[20px]" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36 w-full rounded-[20px]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-[20px]" />
            <Skeleton className="h-40 w-full rounded-[20px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TareasSkeleton(): React.JSX.Element {
  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <Skeleton className="mb-4 h-9 w-32" />
      <Skeleton className="mb-4 h-10 w-full max-w-xs rounded-[12px]" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PlataSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-10 w-48 rounded-[12px]" />
      </div>
      <Skeleton className="h-14 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SuperSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-10 w-40 rounded-[12px]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ListPageSkeleton(): React.JSX.Element {
  return (
    <div className="container max-w-4xl space-y-4 px-4 py-6 sm:py-8 md:px-8">
      <Skeleton className="h-9 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PerfilSkeleton(): React.JSX.Element {
  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6 sm:py-8 md:px-8">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={`b-${i}`} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

export function GridPageSkeleton(): React.JSX.Element {
  return (
    <div className="container max-w-4xl px-4 py-6 sm:py-8 md:px-8">
      <Skeleton className="mb-4 h-9 w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
