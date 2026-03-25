'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-[220px] rounded-[38px]" />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-[132px] rounded-[28px]" />
          ))}
        </div>

        <div className="mt-6 space-y-6">
          <Skeleton className="h-[220px] rounded-[30px]" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[320px] rounded-[30px]" />
            <Skeleton className="h-[320px] rounded-[30px]" />
          </div>
          <Skeleton className="h-[420px] rounded-[30px]" />
        </div>
      </div>
    </div>
  );
}
