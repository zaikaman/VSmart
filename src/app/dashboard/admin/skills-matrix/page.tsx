'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// Lazy load SkillsMatrixPageContent với dynamic import
const SkillsMatrixPageContent = dynamic(
  () => import('@/components/admin/skills-matrix-content').then((mod) => ({ default: mod.SkillsMatrixPageContent })),
  {
    loading: () => (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        
        <Skeleton className="h-12 w-full mb-4" />
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    ),
    ssr: false, // Disable SSR cho admin page để optimize
  }
);

export default function SkillsMatrixPage() {
  return <SkillsMatrixPageContent />;
}
