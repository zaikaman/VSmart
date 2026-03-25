'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#fbfaf4_0%,#f4f6ef_44%,#edf2ea_100%)]">
      <aside className="hidden border-r border-[#e1e7d8] bg-[linear-gradient(180deg,#fdfcf7_0%,#f4f7ef_48%,#eef3ea_100%)] md:flex md:h-dvh md:w-[236px] md:flex-col md:p-3 lg:w-[260px]">
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((group) => (
              <div key={group} className="space-y-2">
                <Skeleton className="h-3 w-24 rounded-full" />
                <div className="space-y-1.5">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={`${group}-${item}`} className="h-10 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Skeleton className="h-[74px] rounded-2xl" />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
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
      </main>
    </div>
  );
}
