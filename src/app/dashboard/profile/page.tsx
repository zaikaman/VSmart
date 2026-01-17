'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load ProfilePageContent với dynamic import
const ProfilePageContent = dynamic(
  () => import('@/components/profile/profile-page-content').then((mod) => ({ default: mod.ProfilePageContent })),
  {
    loading: () => (
      <div className="container mx-auto p-6 max-w-4xl">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    ),
    ssr: false, // Disable SSR cho page này để optimize
  }
);

export default function ProfilePage() {
  return <ProfilePageContent />;
}
