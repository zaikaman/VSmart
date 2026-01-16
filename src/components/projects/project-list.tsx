'use client';

import { useProjects, Project } from '@/lib/hooks/use-projects';
import { ProjectCard } from './project-card';
import { Skeleton } from '@/components/ui/skeleton';

export function ProjectList() {
  const { data, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Không thể tải dự án. Vui lòng thử lại.</p>
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Chưa có dự án nào.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.data.map((project: Project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
