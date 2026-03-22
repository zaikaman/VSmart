'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ProfilePageContent = dynamic(
  () => import('@/components/profile/profile-page-content').then((mod) => ({ default: mod.ProfilePageContent })),
  {
    loading: () => (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-[220px] rounded-[38px]" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Skeleton className="h-[420px] rounded-[30px]" />
          <Skeleton className="h-[520px] rounded-[30px]" />
        </div>
        <Skeleton className="mt-6 h-[340px] rounded-[30px]" />
      </div>
    ),
    ssr: false,
  }
);

export default function ProfilePage() {
  return <ProfilePageContent />;
}
