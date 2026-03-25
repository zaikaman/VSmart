import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageReady } from '@/components/dashboard/page-ready';
import { DashboardLayoutSkeleton } from '@/components/layouts/dashboard-layout-skeleton';
import { DashboardWrapper } from '@/components/layouts/dashboard-wrapper';
import { getDashboardCurrentUser, getDashboardOrganization } from '@/lib/dashboard/dashboard-data';
import { makeQueryClient } from '@/lib/query/make-query-client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Báº£ng Ä‘iá»u khiá»ƒn VSmart',
  description: 'Quáº£n lÃ½ nhiá»‡m vá»¥ thÃ´ng minh',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    redirect('/login');
  }

  const currentUser = await getDashboardCurrentUser(user.email);

  if (!currentUser) {
    redirect('/login');
  }

  if (!currentUser.onboarding_completed) {
    redirect('/onboarding');
  }

  const organization = await getDashboardOrganization(currentUser.to_chuc?.id);
  const queryClient = makeQueryClient();

  queryClient.setQueryData(['current-user'], currentUser);
  queryClient.setQueryData(['organization'], organization);

  return (
    <DashboardWrapper>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardPageReady fallback={<DashboardLayoutSkeleton />}>
          <div className="flex min-h-screen bg-[linear-gradient(180deg,#fbfaf4_0%,#f4f6ef_44%,#edf2ea_100%)]">
            <Sidebar className="hidden md:flex" />
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">{children}</div>
            </main>
          </div>
        </DashboardPageReady>
      </HydrationBoundary>
    </DashboardWrapper>
  );
}
