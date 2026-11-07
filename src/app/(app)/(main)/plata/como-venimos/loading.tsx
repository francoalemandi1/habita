import { Skeleton } from "@/components/ds/skeleton";

export default function PlataComoVenimosLoading(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-40 w-full rounded-[16px]" />
    </div>
  );
}
