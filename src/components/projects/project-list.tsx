'use client';

import { useState } from 'react';
import { useProjects, Project } from '@/lib/hooks/use-projects';
import { useUserSettings } from '@/lib/hooks/use-settings';
import { ProjectCard } from './project-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';

export function ProjectList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data: settingsResponse } = useUserSettings();
  const itemsPerPage = settingsResponse?.data?.dashboard?.itemsPerPage || 10;
  const { data, isLoading, error } = useProjects({ 
    page: currentPage, 
    limit: itemsPerPage 
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.data.map((project: Project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      
      {data.pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.total}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
