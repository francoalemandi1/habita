import { Skeleton } from "@/components/ds/skeleton";

export default function PlataServiciosLoading(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-16 w-full rounded-[16px]" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-[16px]" />
      ))}
    </div>
  );
}
