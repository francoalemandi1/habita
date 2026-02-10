import { Skeleton } from "@/components/ui/skeleton";

export default function RouletteLoading() {
  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6 sm:py-8 md:px-8">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
      <Skeleton className="mx-auto h-10 w-64 rounded-full" />
      <Skeleton className="mx-auto h-72 w-72 rounded-full" />
      <Skeleton className="mx-auto h-14 w-40 rounded-full" />
    </div>
  );
}
